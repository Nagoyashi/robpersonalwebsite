/**
 * db.ts — control-center database access (private plane).
 *
 * Server-side only. Uses the Supabase SERVICE-ROLE key, which bypasses RLS —
 * the control-center tables are deny-by-default (#23), so this is the only way
 * in. NEVER import this into anything that reaches the client bundle; it's used
 * exclusively from /admin/api/* routes (which the middleware gates).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Static import.meta.env access (dynamic keys silently miss custom vars) +
// process.env for the Vercel runtime.
const URL = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

// ---------------------------------------------------------------------------
// Uptime — checks + incidents (written by the cron pinger, read by the page)
// ---------------------------------------------------------------------------
export interface UptimeCheck {
  ok: boolean;
  latency_ms: number | null;
  status: number | null;
  checked_at: string;
}
export interface Incident {
  id: string;
  project: string;
  started_at: string;
  resolved_at: string | null;
  note: string;
}
export interface MonitorData {
  latest: UptimeCheck | null;
  latencies: number[]; // oldest→newest, for the sparkline
  uptimePct: number | null; // ok ratio over 90d, 0–100
}

export async function recordCheck(
  project: string,
  ok: boolean,
  latency_ms: number | null,
  status: number | null,
): Promise<void> {
  const c = db();
  if (!c) return;
  await c.from('uptime_checks').insert({ project, ok, latency_ms, status });
}

/** Most recent check for a project (used by the pinger for consecutive-fail logic). */
export async function lastCheck(project: string): Promise<UptimeCheck | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c
    .from('uptime_checks')
    .select('ok,latency_ms,status,checked_at')
    .eq('project', project)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as UptimeCheck) ?? null;
}

export async function openIncidentFor(project: string): Promise<Incident | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c
    .from('incidents')
    .select('id,project,started_at,resolved_at,note')
    .eq('project', project)
    .is('resolved_at', null)
    .maybeSingle();
  return (data as Incident) ?? null;
}
export async function openIncident(project: string, note: string): Promise<void> {
  const c = db();
  if (!c) return;
  await c.from('incidents').insert({ project, note });
}
export async function resolveIncident(id: string): Promise<void> {
  const c = db();
  if (!c) return;
  await c.from('incidents').update({ resolved_at: new Date().toISOString() }).eq('id', id);
}

/** Latest check + last 48 latencies + 90d uptime% for one monitor. */
export async function getMonitorData(project: string): Promise<MonitorData> {
  const c = db();
  if (!c) return { latest: null, latencies: [], uptimePct: null };
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [recent, total, oks] = await Promise.all([
    c.from('uptime_checks').select('ok,latency_ms,status,checked_at').eq('project', project).order('checked_at', { ascending: false }).limit(48),
    c.from('uptime_checks').select('id', { count: 'exact', head: true }).eq('project', project).gte('checked_at', since),
    c.from('uptime_checks').select('id', { count: 'exact', head: true }).eq('project', project).gte('checked_at', since).eq('ok', true),
  ]);
  const rows = (recent.data ?? []) as UptimeCheck[];
  const latencies = rows
    .map((r) => r.latency_ms)
    .filter((n): n is number => n != null)
    .reverse();
  const uptimePct = total.count ? Math.round(((oks.count ?? 0) / total.count) * 1000) / 10 : null;
  return { latest: rows[0] ?? null, latencies, uptimePct };
}

export async function listIncidents(limit = 8): Promise<Incident[]> {
  const c = db();
  if (!c) return [];
  const { data } = await c
    .from('incidents')
    .select('id,project,started_at,resolved_at,note')
    .order('started_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as Incident[];
}
