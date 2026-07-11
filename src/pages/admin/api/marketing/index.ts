// Marketing collection API (gated by the /admin middleware). GET list, POST create.
export const prerender = false;
import type { APIRoute } from 'astro';
import { listMarketing, createMarketing, audit } from '../../../../lib/ctrl/db';

const CHANNELS = ['X', 'LinkedIn', 'Reddit', 'Blog', 'Email', 'PH'];
const STATUSES = ['idea', 'draft', 'scheduled', 'published'];
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

export const GET: APIRoute = async () => json(await listMarketing());

export const POST: APIRoute = async ({ request, locals }) => {
  const p = await request.json().catch(() => ({}));
  const title = String(p?.title ?? '').trim();
  if (!title) return json({ error: 'title required' }, 400);
  const item = await createMarketing({
    title,
    channel: CHANNELS.includes(p?.channel) ? p.channel : 'X',
    status: STATUSES.includes(p?.status) ? p.status : 'idea',
    project: p?.project ? String(p.project) : null,
    scheduled_for: p?.scheduled_for || null,
  });
  if (item) await audit(locals.operator ?? '', 'marketing.create', item.id, { title });
  return item ? json(item, 201) : json({ error: 'create failed' }, 500);
};
