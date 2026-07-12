/**
 * /api/webhooks/github — instant ops snapshot on GitHub events (#62, ADR-013).
 *
 * The hourly snapshotter (snapshot.yml, #25) is the catch-all; this webhook
 * makes a project's ops row refresh the moment it ships. NOT under /admin —
 * verified instead by the GitHub webhook HMAC (X-Hub-Signature-256) against
 * GITHUB_WEBHOOK_SECRET; fails closed on a bad/absent signature. On a `release`
 * or `push` for a known fleet repo it runs the GitHub connector and writes a
 * snapshot (reusing #25's saveSnapshot).
 */
export const prerender = false;
import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { products } from '../../../config/products';
import { githubOps } from '../../../lib/ctrl/connectors/github';
import { saveSnapshot, dbConfigured } from '../../../lib/ctrl/db';

const SECRET = import.meta.env.GITHUB_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET || '';

/** Timing-safe HMAC-SHA256 check of the raw body against the signature header. */
function verify(raw: string, sigHeader: string | null): boolean {
  if (!SECRET || !sigHeader) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(sigHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  if (!verify(raw, request.headers.get('x-hub-signature-256'))) {
    return new Response('bad signature', { status: 401 });
  }

  const event = request.headers.get('x-github-event') ?? '';
  if (event === 'ping') return new Response('pong', { status: 200 });
  // Only release/push refresh ops data; ack everything else so GitHub is happy.
  if (event !== 'release' && event !== 'push') return new Response('ignored', { status: 202 });
  if (!dbConfigured) return new Response('db not configured', { status: 503 });

  let payload: { repository?: { full_name?: string } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response('bad payload', { status: 400 });
  }

  const fullName = payload.repository?.full_name?.toLowerCase();
  const product = products.find(
    (p) => p.repo && `${p.repo.owner}/${p.repo.name}`.toLowerCase() === fullName,
  );
  if (!product) return new Response('no matching project', { status: 202 });

  const metrics = await githubOps(product);
  if (!metrics) return json({ project: product.slug, captured: false }, 200);
  const ok = await saveSnapshot(product.slug, 'github', metrics as unknown as Record<string, unknown>);
  return json({ project: product.slug, captured: ok, event });
};
