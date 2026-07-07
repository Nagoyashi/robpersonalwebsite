/**
 * /api/cron/ping — the uptime pinger (Phase 3).
 *
 * Called by Vercel Cron (see vercel.json) every 5 min. NOT under /admin, so the
 * OAuth middleware doesn't gate it — instead it's protected by CRON_SECRET
 * (Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when that env is set).
 * Pings each monitored endpoint, records a check, and opens/closes incidents.
 */
export const prerender = false;
import type { APIRoute } from 'astro';
import { monitors } from '../../../lib/ctrl/monitors';
import {
  recordCheck,
  lastCheck,
  openIncidentFor,
  openIncident,
  resolveIncident,
  dbConfigured,
} from '../../../lib/ctrl/db';

// Static import.meta.env access (Vite only resolves literal keys, not dynamic
// ones) + process.env for the Vercel runtime.
const CRON_SECRET = import.meta.env.CRON_SECRET || process.env.CRON_SECRET || '';
const TIMEOUT_MS = 10_000;

async function ping(url: string): Promise<{ ok: boolean; latency: number | null; status: number | null }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    return { ok: res.status < 500, latency: Date.now() - start, status: res.status };
  } catch {
    return { ok: false, latency: null, status: null };
  }
}

export const GET: APIRoute = async ({ request }) => {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) return new Response('unauthorized', { status: 401 });
  }
  if (!dbConfigured) return new Response('db not configured', { status: 503 });

  const results = await Promise.all(
    monitors().map(async (m) => {
      const prev = await lastCheck(m.slug);
      const r = await ping(m.url);
      await recordCheck(m.slug, r.ok, r.latency, r.status);

      // incident: open after 2 consecutive failures, close on first success
      const open = await openIncidentFor(m.slug);
      if (r.ok) {
        if (open) await resolveIncident(open.id);
      } else if (!open && prev && !prev.ok) {
        await openIncident(m.slug, `${m.host} unreachable`);
      }
      return { project: m.slug, ok: r.ok, latency: r.latency, status: r.status };
    }),
  );

  return new Response(JSON.stringify({ checked: results.length, results }), {
    headers: { 'content-type': 'application/json' },
  });
};
