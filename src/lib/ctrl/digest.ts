/**
 * digest.ts — the AI "state of the fleet" brief (ADR-015, #60).
 *
 * Gathers real control-center signals (GitHub ops snapshots, uptime + incidents,
 * marketing/notes, top ops-memory hits) into a compact context, then has Claude
 * synthesize a short markdown brief + highlights. SERVER-ONLY: the Anthropic key
 * is a non-PUBLIC_ env var, never bundled to the client. Degrades to null when
 * unconfigured (no key) so the cron endpoint can report "not configured" rather
 * than fabricate a digest.
 *
 * Honesty (carried from ADR-013/015): the model is instructed to use ONLY the
 * provided data and to say so when a signal is missing — never invent metrics.
 */
import Anthropic from '@anthropic-ai/sdk';
import { products } from '../../config/products';
import { monitors } from './monitors';
import {
  getMonitorData,
  listIncidents,
  listNotes,
  listMarketing,
  latestSnapshot,
  searchMemory,
} from './db';
import type { OpsMetrics } from './connectors/github';

const ANTHROPIC_KEY = import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
// Cheap by default (ADR-015): the digest is short structured-data summarization,
// which claude-haiku-4-5 handles well at ~1/5 the cost of Opus. Override without
// a code change via the DIGEST_MODEL env var (e.g. claude-sonnet-4-6 for more
// analytical nuance).
const MODEL =
  import.meta.env.DIGEST_MODEL || process.env.DIGEST_MODEL || 'claude-haiku-4-5';

/** True once the digest model is configured (env). */
export const digestConfigured = Boolean(ANTHROPIC_KEY);

const SYSTEM = [
  'You are the operations analyst for a solo software studio\'s private control center.',
  'Write a concise daily "state of the fleet" brief for the founder (Robert).',
  'Use ONLY the data provided in the user message — never invent versions, metrics,',
  'counts, or events. If a signal is missing or empty, say so plainly.',
  'Lead with what needs attention (incidents, stalls, dips), then steady state.',
  'Be direct and specific; skip filler and praise.',
  '',
  'Respond with ONLY a JSON object (no markdown fences) of the shape:',
  '{"summary": "<markdown brief, a few short paragraphs>", "highlights": ["<one-line callout>", ...]}',
  'highlights: 2-5 of the most important items, each one short line.',
].join('\n');

/** Build the compact fleet context from real signals. */
async function buildContext(): Promise<string> {
  const mons = monitors();
  const [incidents, notes, marketing, memHits] = await Promise.all([
    listIncidents(10),
    listNotes(),
    listMarketing(),
    searchMemory('recent fleet incidents, outages, and operational issues', 8),
  ]);

  const lines: string[] = [`# Fleet snapshot (as of ${new Date().toISOString()})`, '', '## Projects'];
  for (const p of products) {
    const parts = [`- ${p.name} [${p.status}]`];
    const snap = await latestSnapshot<OpsMetrics>(p.slug, 'github');
    if (snap?.metrics) {
      const m = snap.metrics;
      if (m.version) parts.push(`version ${m.version}`);
      if (m.cycle) parts.push(`cycle "${m.cycle.name}" ${m.cycle.closedIssues}/${m.cycle.totalIssues} issues`);
    }
    if (mons.some((x) => x.slug === p.slug)) {
      const d = await getMonitorData(p.slug);
      if (d.latest) {
        parts.push(`uptime ${d.latest.ok ? 'up' : 'DOWN'}${d.uptimePct != null ? ` (${d.uptimePct}%/90d)` : ''}`);
      } else {
        parts.push('uptime: no checks yet');
      }
    }
    lines.push(parts.join(' · '));
  }

  lines.push('', '## Incidents (recent)');
  if (incidents.length) {
    for (const i of incidents) {
      lines.push(`- ${i.project}: ${i.note} — ${i.resolved_at ? 'resolved' : 'ONGOING'} (started ${i.started_at})`);
    }
  } else lines.push('- none recorded');

  lines.push('', '## Marketing pipeline');
  if (marketing.length) {
    const byStatus = marketing.reduce<Record<string, number>>((a, m) => {
      a[m.status] = (a[m.status] ?? 0) + 1;
      return a;
    }, {});
    lines.push(`- ${marketing.length} items: ${Object.entries(byStatus).map(([s, n]) => `${n} ${s}`).join(', ')}`);
  } else lines.push('- empty');

  lines.push('', `## Notes: ${notes.length} captured`);

  lines.push('', '## Ops memory (relevant past signals)');
  if (memHits.length) {
    for (const h of memHits) lines.push(`- [${h.kind}] ${h.text} (${h.created_at})`);
  } else lines.push('- none (or semantic search unconfigured)');

  return lines.join('\n');
}

export interface DigestResult {
  summary: string;
  highlights: string[];
  model: string;
}

/** Gather signals + synthesize a brief. null when the model is unconfigured. */
export async function generateDigest(): Promise<DigestResult | null> {
  if (!ANTHROPIC_KEY) return null;
  const context = await buildContext();
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: 'user', content: context }],
  });
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
  // Defensive: prefer a JSON {summary, highlights}; fall back to raw text.
  try {
    const json = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
    const parsed = JSON.parse(json) as { summary?: string; highlights?: string[] };
    return {
      summary: parsed.summary?.trim() || text,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 6) : [],
      model: res.model,
    };
  } catch {
    return { summary: text, highlights: [], model: res.model };
  }
}
