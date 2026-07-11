/**
 * connectors/github.ts — the GitHub pull connector (ADR-013).
 *
 * A `fetch() → normalized records` module: given a product, it reads live
 * GitHub (releases + the open milestone + its issues) and returns one
 * normalized ops row (`OpsMetrics`). Two callers share it:
 *   - the snapshot cron (/api/cron/snapshot) — writes each row into Supabase;
 *   - the Overview page (overview.ts) — live fallback when no snapshot exists.
 *
 * Timestamps are stored RAW (ISO), never pre-formatted as "3 days ago" — a
 * snapshot read hours later must still render a correct relative time. Every
 * call is wrapped and degrades to null on a total GitHub blackout, so we never
 * snapshot (or overwrite good data with) a fabricated empty row.
 *
 * Token: read-only GitHub App installation token (ADR-007), a non-PUBLIC_ env
 * var — server-only, never bundled to the client. Public repos work without it.
 */
import type { Product } from '../../../config/products';

const API = 'https://api.github.com';
const TIMEOUT_MS = 8000;
const TOKEN = process.env.FLEET_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';

async function gh<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'kissrobert-ctrl',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface ApiRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  draft: boolean;
}
interface ApiMilestone {
  number: number;
  title: string;
  description: string | null;
  open_issues: number;
  closed_issues: number;
}
interface ApiIssue {
  title: string;
  pull_request?: unknown;
}

/** One release, raw (no pre-formatted relative time). */
export interface OpsRelease {
  version: string;
  publishedAt: string | null;
  title: string;
}
/** The open-milestone cycle, when there is one. */
export interface OpsCycle {
  name: string;
  summary: string;
  closedIssues: number;
  totalIssues: number;
  done: string[];
  upcoming: string[];
}
/** Normalized per-project ops row — the connector's snapshot payload. */
export interface OpsMetrics {
  version: string; // latest non-draft tag ('' if none)
  lastPublishedAt: string | null; // ISO of the latest release
  releases: OpsRelease[]; // up to 4, newest first
  milestoneRead: boolean; // the milestone endpoint answered (distinguishes
  // "between phases" from an unreadable "no data")
  cycle: OpsCycle | null; // null when there's no open milestone
}

/** The owner/name path for a connectable repo, or null (no repo / manual-only). */
function repoPath(p: Product): string | null {
  return p.repo && !p.manualOnly ? `${p.repo.owner}/${p.repo.name}` : null;
}

/**
 * Fetch and normalize one project's GitHub ops row. Returns null when the
 * project has no connectable repo, or when GitHub is entirely unreadable
 * (releases AND milestones both failed) — the caller then falls back rather
 * than trusting an empty row.
 */
export async function githubOps(p: Product): Promise<OpsMetrics | null> {
  const path = repoPath(p);
  if (!path) return null;

  const [rels, ms] = await Promise.all([
    gh<ApiRelease[]>(`/repos/${path}/releases`),
    gh<ApiMilestone[]>(`/repos/${path}/milestones?state=open`),
  ]);
  // Total blackout (rate limit / no access / outage): don't manufacture a row.
  if (rels === null && ms === null) return null;

  const live = (rels ?? []).filter((r) => !r.draft);
  const releases: OpsRelease[] = live.slice(0, 4).map((r) => ({
    version: r.tag_name,
    publishedAt: r.published_at,
    title: r.name || r.tag_name,
  }));

  let cycle: OpsCycle | null = null;
  const open = ms?.[0];
  if (open) {
    const [closed, openIssues] = await Promise.all([
      gh<ApiIssue[]>(`/repos/${path}/issues?milestone=${open.number}&state=closed&per_page=100`),
      gh<ApiIssue[]>(`/repos/${path}/issues?milestone=${open.number}&state=open&per_page=100`),
    ]);
    cycle = {
      name: open.title,
      summary: open.description?.trim() || 'Open milestone — issues in progress.',
      closedIssues: open.closed_issues,
      totalIssues: open.open_issues + open.closed_issues,
      done: (closed ?? []).filter((i) => !i.pull_request).slice(0, 4).map((i) => i.title),
      upcoming: (openIssues ?? []).filter((i) => !i.pull_request).slice(0, 4).map((i) => i.title),
    };
  }

  return {
    version: live[0]?.tag_name ?? '',
    lastPublishedAt: live[0]?.published_at ?? null,
    releases,
    milestoneRead: ms !== null,
    cycle,
  };
}
