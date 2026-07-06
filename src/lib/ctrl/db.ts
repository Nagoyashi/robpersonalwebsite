/**
 * db.ts — control-center database access (private plane).
 *
 * Server-side only. Uses the Supabase SERVICE-ROLE key, which bypasses RLS —
 * the control-center tables are deny-by-default (#23), so this is the only way
 * in. NEVER import this into anything that reaches the client bundle; it's used
 * exclusively from /admin/api/* routes (which the middleware gates).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (k: string): string => (import.meta.env[k] as string | undefined) ?? process.env[k] ?? '';
const URL = env('SUPABASE_URL');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');

/** True once the service-role key is configured (env). */
export const dbConfigured = Boolean(URL && SERVICE_KEY);

let client: SupabaseClient | null = null;
/** Lazily-created service-role client (null if unconfigured — callers degrade). */
export function db(): SupabaseClient | null {
  if (!dbConfigured) return null;
  if (!client) client = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
  return client;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export interface Note {
  id: string;
  folder: 'Projects' | 'Ideas' | 'Personal';
  body: string;
  updated_at: string;
}

export async function listNotes(): Promise<Note[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c
    .from('notes')
    .select('id,folder,body,updated_at')
    .order('updated_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as Note[];
}

export async function createNote(folder: Note['folder']): Promise<Note | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from('notes')
    .insert({ folder, body: '' })
    .select('id,folder,body,updated_at')
    .single();
  if (error) return null;
  return data as Note;
}

export async function updateNote(id: string, body: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from('notes').update({ body }).eq('id', id);
  return !error;
}

export async function deleteNote(id: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from('notes').delete().eq('id', id);
  return !error;
}

// ---------------------------------------------------------------------------
// Marketing pipeline
// ---------------------------------------------------------------------------
export type PipelineStatus = 'idea' | 'draft' | 'scheduled' | 'published';
export type Channel = 'X' | 'LinkedIn' | 'Reddit' | 'Blog' | 'Email' | 'PH';

export interface MarketingItem {
  id: string;
  title: string;
  channel: Channel;
  project: string | null;
  status: PipelineStatus;
  scheduled_for: string | null;
}
export interface SeoArticle {
  id: string;
  title: string;
  keyword: string;
  project: string | null;
  words: number | null;
  status: PipelineStatus;
  url: string | null;
}

const MK_COLS = 'id,title,channel,project,status,scheduled_for';
const SEO_COLS = 'id,title,keyword,project,words,status,url';

export async function listMarketing(): Promise<MarketingItem[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from('marketing_items').select(MK_COLS).order('updated_at', { ascending: false });
  return (data ?? []) as MarketingItem[];
}
export async function createMarketing(row: Partial<MarketingItem>): Promise<MarketingItem | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.from('marketing_items').insert(row).select(MK_COLS).single();
  return (data as MarketingItem) ?? null;
}
export async function updateMarketing(id: string, patch: Partial<MarketingItem>): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from('marketing_items').update(patch).eq('id', id);
  return !error;
}
export async function deleteMarketing(id: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from('marketing_items').delete().eq('id', id);
  return !error;
}

export async function listSeo(): Promise<SeoArticle[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c.from('seo_articles').select(SEO_COLS).order('updated_at', { ascending: false });
  return (data ?? []) as SeoArticle[];
}
export async function createSeo(row: Partial<SeoArticle>): Promise<SeoArticle | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c.from('seo_articles').insert(row).select(SEO_COLS).single();
  return (data as SeoArticle) ?? null;
}
export async function updateSeo(id: string, patch: Partial<SeoArticle>): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from('seo_articles').update(patch).eq('id', id);
  return !error;
}
export async function deleteSeo(id: string): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from('seo_articles').delete().eq('id', id);
  return !error;
}
