/**
 * /api/cron/digest — the AI "state of the fleet" digest job (ADR-015, #60).
 *
 * Called on a schedule by a GitHub Action (.github/workflows/digest.yml) — same
 * pattern as the uptime pinger and ops snapshotter: NOT under /admin, so the
 * OAuth middleware doesn't gate it; protected by CRON_SECRET. Gathers real
 * fleet signals, has Claude synthesize a brief, and stores it in `digests`.
 * Delivery (email/ntfy) is a separate concern (#61); this only generates+stores.
 */
export const prerender = false;
import type { APIRoute } from 'astro';
import { saveDigest, dbConfigured } from '../../../lib/ctrl/db';
import { generateDigest, digestConfigured } from '../../../lib/ctrl/digest';

const CRON_SECRET = import.meta.env.CRON_SECRET || process.env.CRON_SECRET || '';

export const GET: APIRoute = async ({ request }) => {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) return new Response('unauthorized', { status: 401 });
  }
  if (!dbConfigured) return new Response('db not configured', { status: 503 });
  if (!digestConfigured) return new Response('digest model not configured (ANTHROPIC_API_KEY)', { status: 503 });

  const result = await generateDigest();
  if (!result) return new Response('digest generation failed', { status: 502 });

  const ok = await saveDigest('daily', result.summary, result.highlights, result.model);
  return new Response(JSON.stringify({ saved: ok, model: result.model, highlights: result.highlights.length }), {
    headers: { 'content-type': 'application/json' },
  });
};
