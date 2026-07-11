/**
 * /api/cron/snapshot — the GitHub ops snapshotter (ADR-013, #25).
 *
 * Called on a schedule by a GitHub Action (.github/workflows/snapshot.yml) —
 * same pattern as the uptime pinger: NOT under /admin, so the OAuth middleware
 * doesn't gate it; protected instead by CRON_SECRET (the Action sends
 * `Authorization: Bearer <CRON_SECRET>`). Runs the GitHub connector for every
 * connectable product and writes each normalized ops row into `snapshots`.
 * Connector targets come from products.ts (the source of truth), so a project
 * appears here the moment it has a repo — no separate registry to maintain.
 */
export const prerender = false;
import type { APIRoute } from 'astro';
import { products } from '../../../config/products';
import { githubOps } from '../../../lib/ctrl/connectors/github';
import { saveSnapshot, dbConfigured } from '../../../lib/ctrl/db';

const CRON_SECRET = import.meta.env.CRON_SECRET || process.env.CRON_SECRET || '';

export const GET: APIRoute = async ({ request }) => {
  if (CRON_SECRET) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) return new Response('unauthorized', { status: 401 });
  }
  if (!dbConfigured) return new Response('db not configured', { status: 503 });

  const results = await Promise.all(
    products.map(async (p) => {
      const metrics = await githubOps(p);
      // null => no connectable repo, or a GitHub blackout: skip rather than
      // snapshot an empty row over good history.
      if (!metrics) return { project: p.slug, captured: false };
      const ok = await saveSnapshot(p.slug, 'github', metrics as unknown as Record<string, unknown>);
      return { project: p.slug, captured: ok };
    }),
  );

  const captured = results.filter((r) => r.captured).length;
  return new Response(JSON.stringify({ captured, skipped: results.length - captured, results }), {
    headers: { 'content-type': 'application/json' },
  });
};
