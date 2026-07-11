// Single marketing item API (gated). PATCH partial fields, DELETE.
export const prerender = false;
import type { APIRoute } from 'astro';
import { updateMarketing, deleteMarketing, audit, type MarketingItem } from '../../../../lib/ctrl/db';

const CHANNELS = ['X', 'LinkedIn', 'Reddit', 'Blog', 'Email', 'PH'];
const STATUSES = ['idea', 'draft', 'scheduled', 'published'];

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const p = await request.json().catch(() => ({}));
  const patch: Partial<MarketingItem> = {};
  if (typeof p?.title === 'string') patch.title = p.title.trim();
  if (CHANNELS.includes(p?.channel)) patch.channel = p.channel;
  if (STATUSES.includes(p?.status)) patch.status = p.status;
  if ('project' in p) patch.project = p.project ? String(p.project) : null;
  if ('scheduled_for' in p) patch.scheduled_for = p.scheduled_for || null;
  if (!Object.keys(patch).length) return new Response(null, { status: 400 });
  const ok = await updateMarketing(params.id!, patch);
  if (ok) await audit(locals.operator ?? '', 'marketing.update', params.id!, patch);
  return new Response(null, { status: ok ? 204 : 500 });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const ok = await deleteMarketing(params.id!);
  if (ok) await audit(locals.operator ?? '', 'marketing.delete', params.id!);
  return new Response(null, { status: ok ? 204 : 500 });
};
