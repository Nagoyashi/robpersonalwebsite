import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

// Hand-written content pages (now, uses). One Markdown file per page.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content' }),
  schema: z.object({
    title: z.string(),
    // now.md uses `headline` (rendered on the homepage Now strip) + `updated`.
    headline: z.string().optional(),
    updated: z.string().optional(),
  }),
});

export const collections = { pages };
