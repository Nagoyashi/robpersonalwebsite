// Single SEO article API (gated). PATCH partial fields, DELETE.
export const prerender = false;
import type { APIRoute } from 'astro';
import { updateSeo, deleteSeo, audit, type SeoArticle } from '../../../../lib/ctrl/db';

const STATUSES = ['idea', 'draft', 'scheduled', 'published'];

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const p = await request.json().catch(() => ({}));
  const patch: Partial<SeoArticle> = {};
  if (typeof p?.title === 'string') patch.title = p.title.trim();
  if (typeof p?.keyword === 'string') patch.keyword = p.keyword.trim();
  if (STATUSES.includes(p?.status)) patch.status = p.status;
  if ('project' in p) patch.project = p.project ? String(p.project) : null;
  if ('words' in p) patch.words = Number.isFinite(p?.words) ? Math.trunc(p.words) : null;
  if ('url' in p) patch.url = p.url ? String(p.url) : null;
  if (!Object.keys(patch).length) return new Response(null, { status: 400 });
  const ok = await updateSeo(params.id!, patch);
  if (ok) await audit(locals.operator ?? '', 'seo.update', params.id!, patch);
  return new Response(null, { status: ok ? 204 : 500 });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const ok = await deleteSeo(params.id!);
  if (ok) await audit(locals.operator ?? '', 'seo.delete', params.id!);
  return new Response(null, { status: ok ? 204 : 500 });
};
