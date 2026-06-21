import type { APIRoute } from 'astro';
import { COMING_SOON } from '../config/site';

// Flag-aware robots.txt. Under construction the whole site is disallowed and the
// sitemap is withheld, so the unfinished/legally-incomplete site isn't indexed.
// When COMING_SOON flips to false this reverts to the normal allow-all + sitemap.
export const GET: APIRoute = () => {
  const body = COMING_SOON
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\n\nSitemap: https://kissrobert.com/sitemap-index.xml\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
