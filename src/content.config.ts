import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

// Hand-written content pages (stack). One Markdown file per page.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content' }),
  schema: z.object({
    title: z.string(),
    updated: z.string().optional(),
  }),
});

export const collections = { pages };
