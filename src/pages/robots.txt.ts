import type { APIRoute } from 'astro';
import { INDEXABLE } from '../config/site';

// Flag-aware robots.txt. While the site isn't INDEXABLE (under construction OR a
// soft-launched-but-noindex reveal) the whole site is disallowed and the sitemap
// withheld, so it stays out of search. Once INDEXABLE: allow-all + sitemap.
export const GET: APIRoute = () => {
  const body = INDEXABLE
    ? 'User-agent: *\nAllow: /\n\nSitemap: https://kissrobert.com/sitemap-index.xml\n'
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
