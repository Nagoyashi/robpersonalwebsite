// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Custom domain (kissrobert.com) at root. See public/CNAME and DEPLOY.md.
// If deploying to the github.io project subpath instead, set base: '/robpersonalwebsite'.
export default defineConfig({
  site: 'https://kissrobert.com',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
