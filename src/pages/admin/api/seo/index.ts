// SEO collection API (gated). GET list, POST create.
export const prerender = false;
import type { APIRoute } from 'astro';
import { listSeo, createSeo, audit } from '../../../../lib/ctrl/db';

const STATUSES = ['idea', 'draft', 'scheduled', 'published'];
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });

export const GET: APIRoute = async () => json(await listSeo());

export const POST: APIRoute = async ({ request, locals }) => {
  const p = await request.json().catch(() => ({}));
  const title = String(p?.title ?? '').trim();
  const keyword = String(p?.keyword ?? '').trim();
  if (!title || !keyword) return json({ error: 'title and keyword required' }, 400);
  const words = Number.isFinite(p?.words) ? Math.trunc(p.words) : null;
  const article = await createSeo({
    title,
    keyword,
    status: STATUSES.includes(p?.status) ? p.status : 'idea',
    project: p?.project ? String(p.project) : null,
    words,
    url: p?.url ? String(p.url) : null,
  });
  if (article) await audit(locals.operator ?? '', 'seo.create', article.id, { title, keyword });
  return article ? json(article, 201) : json({ error: 'create failed' }, 500);
};
