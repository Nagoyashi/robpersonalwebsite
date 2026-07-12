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
// Snapshots — normalized connector output, captured over time (ADR-013, #25).
// `metrics` is a source-agnostic jsonb payload; the read path is latest-first.
// ---------------------------------------------------------------------------
export interface Snapshot<T = Record<string, unknown>> {
  metrics: T;
  captured_at: string;
}

/** Persist one connector run's normalized row for a project. */
export async function saveSnapshot(
  project: string,
  source: string,
  metrics: Record<string, unknown>,
): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from('snapshots').insert({ project, source, metrics });
  return !error;
}

/** The most recent snapshot for a (project, source), or null if none/unconfigured. */
export async function latestSnapshot<T = Record<string, unknown>>(
  project: string,
  source: string,
): Promise<Snapshot<T> | null> {
  const c = db();
  if (!c) return null;
  const { data } = await c
    .from('snapshots')
    .select('metrics,captured_at')
    .eq('project', project)
    .eq('source', source)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Snapshot<T>) ?? null;
}

// ---------------------------------------------------------------------------
// Audit log — append-only trail of every control action (ADR-012, #27).
// ---------------------------------------------------------------------------
/**
 * Record one control action against the operator who performed it. Best-effort:
 * a failed write must never break the action it's recording (the trail is
 * defence-in-depth, not the operation's source of truth).
 */
export async function audit(
  actor: string,
  action: string,
  target: string | null = null,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const c = db();
  if (!c) return;
  await c.from('audit_log').insert({ actor: actor || 'unknown', action, target, detail });
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

// ---------------------------------------------------------------------------
// Ops memory — pgvector semantic store for the AI layer (ADR-015, #59).
// Embeddings via Voyage (voyage-3.5-lite, 1024-d), server-side only. Every
// helper degrades to a no-op when the db or the embeddings key is unconfigured.
// ---------------------------------------------------------------------------
const VOYAGE_KEY = import.meta.env.VOYAGE_API_KEY || process.env.VOYAGE_API_KEY || '';
const VOYAGE_MODEL = 'voyage-3.5-lite'; // 1024-d — matches ops_memory.embedding
const EMBED_TIMEOUT_MS = 10_000;

export interface MemoryHit {
  id: string;
  kind: string;
  text: string;
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  similarity: number;
}

/** Embed one string via Voyage. null when unconfigured or on any failure. */
async function embed(text: string): Promise<number[] | null> {
  if (!VOYAGE_KEY) return null;
  try {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${VOYAGE_KEY}` },
      body: JSON.stringify({ input: [text], model: VOYAGE_MODEL }),
      signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { embedding: number[] }[] };
    return json.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

/**
 * Record one ops memory, embedding it if possible. Best-effort: a memory is
 * still stored (embedding null) when Voyage is unconfigured, so nothing is lost;
 * it just won't be semantically searchable until re-embedded.
 */
export async function addMemory(
  kind: string,
  text: string,
  source: string | null = null,
  metadata: Record<string, unknown> = {},
): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const embedding = await embed(text);
  const { error } = await c.from('ops_memory').insert({ kind, text, source, metadata, embedding });
  return !error;
}

/** Top-k memories most similar to `query` (empty when unconfigured/no matches). */
export async function searchMemory(query: string, matchCount = 8): Promise<MemoryHit[]> {
  const c = db();
  if (!c) return [];
  const query_embedding = await embed(query);
  if (!query_embedding) return [];
  const { data, error } = await c.rpc('match_ops_memory', { query_embedding, match_count: matchCount });
  if (error) return [];
  return (data ?? []) as MemoryHit[];
}

// ---------------------------------------------------------------------------
// Aggregate fleet health — build-time read for the public hero badge (#41).
// ---------------------------------------------------------------------------
export type FleetStatus = 'operational' | 'degraded' | 'unknown';
export interface FleetHealth {
  status: FleetStatus;
  up: number;
  down: number;
  total: number;
}

// A check older than this can't be trusted as "current" — the cron pings every
// ~5 min, so 30 min of silence means the pinger is stuck, not that all is well.
const FRESH_MS = 30 * 60_000;

/**
 * Roll each monitored project's latest check into one honest fleet state:
 * - operational: every monitor has a fresh, passing check
 * - degraded: at least one monitor's latest check failed
 * - unknown: db unconfigured, some monitor has no/stale data (never claim green
 *   on absent data — see #41 acceptance)
 */
export async function fleetHealth(projects: string[]): Promise<FleetHealth> {
  const total = projects.length;
  const c = db();
  if (!c || total === 0) return { status: 'unknown', up: 0, down: 0, total };
  const checks = await Promise.all(projects.map((p) => lastCheck(p)));
  const now = Date.now();
  let up = 0;
  let down = 0;
  let unresolved = 0; // missing or stale — can't confirm either way
  for (const chk of checks) {
    if (!chk || now - new Date(chk.checked_at).getTime() > FRESH_MS) unresolved++;
    else if (chk.ok) up++;
    else down++;
  }
  if (down > 0) return { status: 'degraded', up, down, total };
  if (unresolved > 0) return { status: 'unknown', up, down, total };
  return { status: 'operational', up, down, total };
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
