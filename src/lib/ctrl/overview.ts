/**
 * overview.ts — control-center Overview data (private /admin plane).
 *
 * Runs SERVER-SIDE at request time (the page is `prerender = false`). Merges
 * the products.ts source of truth with each project's normalized ops row.
 *
 * Read path (ADR-013, #25): SNAPSHOT-FIRST — the latest Supabase snapshot
 * written by the snapshot cron (fast, and survives a GitHub outage/rate limit).
 * If no snapshot exists yet, it falls back to a LIVE connector fetch, then to
 * products.ts. So the page degrades to honest empty/manual states — never a
 * fabricated cycle or metric.
 *
 * Token: read-only GitHub App installation token (ADR-007), a non-PUBLIC_ env
 * var — server-only, never bundled to the client. Public repos work without it.
 */
import { products, type Product } from '../../config/products';
import { relativeTime } from '../format';
import { githubOps, type OpsMetrics } from './connectors/github';
import { latestSnapshot } from './db';

/** A project's ops row, snapshot-first with a live connector fallback. */
async function opsMetricsFor(p: Product): Promise<OpsMetrics | null> {
  const snap = await latestSnapshot<OpsMetrics>(p.slug, 'github');
  if (snap) return snap.metrics;
  return githubOps(p);
}

// Status → accent (DESIGN_SPEC §1). bg is the same colour at 10% alpha.
const STATUS_HEX: Record<string, string> = {
  live: '#3fb950',
  beta: '#d29922',
  building: '#58a6ff',
  maintained: '#b07cff',
  archived: '#6e7681',
};
export const statusColor = (s: string) => STATUS_HEX[s] ?? '#6e7681';
const STATUS_BG: Record<string, string> = {
  live: 'rgba(63,185,80,.1)',
  beta: 'rgba(210,153,34,.1)',
  building: 'rgba(88,166,255,.1)',
  maintained: 'rgba(176,124,255,.1)',
  archived: 'rgba(110,118,129,.1)',
};
export const statusBg = (s: string) => STATUS_BG[s] ?? 'rgba(110,118,129,.1)';

export interface Pill {
  slug: string;
  name: string;
  dot: string;
  active: boolean;
}

/** All projects (incl. stealth — this is the private view) as selector pills. */
export function getPills(selected: string): Pill[] {
  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    dot: statusColor(p.status),
    active: p.slug === selected,
  }));
}

/** The default selected project: flagship first, else the first product. */
export function defaultSlug(): string {
  return (products.find((p) => p.flagship) ?? products[0]).slug;
}

export interface ReleaseRow {
  version: string;
  when: string;
  title: string;
}
export interface Detail {
  slug: string;
  name: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  stealth: boolean;
  tagline: string;
  version: string;
  lastShipped: string;
  kindLabel: string;
  siteUrl: string | null;
  siteHost: string | null;
  repoLabel: string | null;
  cycleName: string;
  cyclePhase: string;
  cycleSummary: string;
  milestoneText: string;
  progressText: string;
  progress: number;
  done: string[];
  upcoming: string[];
  releases: ReleaseRow[];
  intakeText: string;
  intakeColor: string;
}

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Fallback labels for products with no live release data, by status. */
function fallbackVersionLabel(p: Product): { version: string; lastShipped: string } {
  if (p.fallbackVersion) return { version: p.fallbackVersion, lastShipped: relativeTime(p.fallbackDate) };
  switch (p.status) {
    case 'beta':
      return { version: 'beta', lastShipped: 'private beta' };
    case 'building':
      return { version: 'pre-release', lastShipped: p.siteUrl ? 'in development' : 'not deployed' };
    case 'maintained':
      return { version: 'stable', lastShipped: 'stable' };
    default:
      return { version: p.manualOnly ? 'external' : '—', lastShipped: p.manualOnly ? 'external · manual' : '—' };
  }
}

export async function getProjectDetail(slug: string): Promise<Detail> {
  const p = products.find((x) => x.slug === slug) ?? products[0];
  const metrics = await opsMetricsFor(p);

  // --- format the ops row (snapshot or live) into the Detail view ---
  let version = '';
  let lastShipped = '';
  let releases: ReleaseRow[] = [];
  let cycleName = '';
  let cycleSummary = '';
  let milestoneText = '';
  let progressText = '';
  let progress = 0;
  let cyclePhase = '';
  let done: string[] = [];
  let upcoming: string[] = [];

  if (metrics) {
    if (metrics.version) {
      version = metrics.version;
      // Relative time is computed HERE, at read — never baked into the snapshot.
      lastShipped = `shipped ${relativeTime(metrics.lastPublishedAt)}`;
    }
    releases = metrics.releases.map((r) => ({
      version: r.version,
      when: relativeTime(r.publishedAt),
      title: r.title,
    }));

    if (metrics.cycle) {
      const cy = metrics.cycle;
      cycleName = cy.name;
      cycleSummary = cy.summary;
      cyclePhase = 'in progress';
      progress = cy.totalIssues ? Math.round((cy.closedIssues / cy.totalIssues) * 100) : 0;
      milestoneText = cy.name;
      progressText = cy.totalIssues ? `${cy.closedIssues} / ${cy.totalIssues} issues` : 'no issues';
      done = cy.done;
      upcoming = cy.upcoming;
    } else if (metrics.milestoneRead) {
      // Read OK but no open milestone — an honest "between phases", NOT "no data".
      cycleName = 'between phases';
      cyclePhase = 'idle';
      cycleSummary = 'No open milestone right now.';
      milestoneText = 'no active milestone · between phases';
      progressText = version ? 'shipped' : '—';
      progress = version ? 100 : 0;
    }
  }

  // --- fallbacks (private/no-repo/manual, or a GitHub miss) ---
  if (!version) {
    const fb = fallbackVersionLabel(p);
    version = fb.version;
    lastShipped = fb.lastShipped;
  }
  if (!cycleName) {
    cycleName = p.manualOnly ? 'external' : 'no data';
    cyclePhase = p.status;
    cycleSummary = p.manualOnly
      ? 'Tracked here for visibility; managed outside this account.'
      : 'No control-center data yet — connect the repo to populate this.';
    milestoneText = p.manualOnly ? 'external — manual entry' : 'no data';
    progressText = '—';
  }

  return {
    slug: p.slug,
    name: p.name,
    statusLabel: p.status.toUpperCase(),
    statusColor: statusColor(p.status),
    statusBg: statusBg(p.status),
    stealth: p.stealth === true,
    tagline: p.tagline,
    version,
    lastShipped,
    kindLabel: p.kind,
    siteUrl: p.siteUrl ?? null,
    siteHost: hostOf(p.siteUrl),
    repoLabel: p.repo ? `${p.repo.owner}/${p.repo.name}` : null,
    cycleName,
    cyclePhase,
    cycleSummary,
    milestoneText,
    progressText,
    progress,
    done,
    upcoming,
    releases,
    // Intake queue (proposals awaiting review) has no defined source yet —
    // QUESTIONS §4. Honest default until that mechanism is wired.
    intakeText: 'clear',
    intakeColor: '#3fb950',
  };
}
