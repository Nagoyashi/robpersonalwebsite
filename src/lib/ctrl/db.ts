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
