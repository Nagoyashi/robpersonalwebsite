// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// Hosted on Vercel under kissrobert.com (see DEPLOY.md, ADR-010).
// output stays 'static' (the default): public pages prerender, and the
// private plane opts into server rendering per-route via `export const
// prerender = false` (see ADR-009). The Vercel adapter is what lets those
// server routes — and Vercel Cron (#25) — run; static pages still ship as
// plain HTML.
export default defineConfig({
  site: 'https://kissrobert.com',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  adapter: vercel(),
  integrations: [sitemap()],
});
