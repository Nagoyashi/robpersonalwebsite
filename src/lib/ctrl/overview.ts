/**
 * overview.ts — control-center Overview data (private /admin plane).
 *
 * Runs SERVER-SIDE at request time (the page is `prerender = false`). Merges
 * the products.ts source of truth with live GitHub data (releases + open
 * milestone + its issues). Every GitHub call is wrapped and falls back to
 * config, so a private repo with no App access, a rate limit, or a hiccup
 * degrades to honest empty/manual states — never a fabricated cycle or metric.
 *
 * Token: read-only GitHub App installation token (ADR-007), a non-PUBLIC_ env
 * var — server-only, never bundled to the client. Public repos work without it.
 */
import { products, type Product } from '../../config/products';
import { relativeTime } from '../format';

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

// Status → accent (DESIGN_SPEC §1). bg is the same colour at 10% alpha.
const STATUS_HEX: Record<string, string> = {
  live: '#3fb950',
  beta: '#d29922',
  building: '#58a6ff',
  maintained: '#b07cff',
  archived: '#6e7681',
};
export const statusColor = (s: string) => STATUS_HEX[s] ?? '#6e7681';
const STATUS_BG: Record<string, string> = {
  live: 'rgba(63,185,80,.1)',
  beta: 'rgba(210,153,34,.1)',
  building: 'rgba(88,166,255,.1)',
  maintained: 'rgba(176,124,255,.1)',
  archived: 'rgba(110,118,129,.1)',
};
export const statusBg = (s: string) => STATUS_BG[s] ?? 'rgba(110,118,129,.1)';

export interface Pill {
  slug: string;
  name: string;
  dot: string;
  active: boolean;
}

/** All projects (incl. stealth — this is the private view) as selector pills. */
export function getPills(selected: string): Pill[] {
  return products.map((p) => ({
    slug: p.slug,
    name: p.name,
    dot: statusColor(p.status),
    active: p.slug === selected,
  }));
}

/** The default selected project: flagship first, else the first product. */
export function defaultSlug(): string {
  return (products.find((p) => p.flagship) ?? products[0]).slug;
}

export interface ReleaseRow {
  version: string;
  when: string;
  title: string;
}
export interface Detail {
  slug: string;
  name: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  stealth: boolean;
  tagline: string;
  version: string;
  lastShipped: string;
  kindLabel: string;
  siteUrl: string | null;
  siteHost: string | null;
  repoLabel: string | null;
  cycleName: string;
  cyclePhase: string;
  cycleSummary: string;
  milestoneText: string;
  progressText: string;
  progress: number;
  done: string[];
  upcoming: string[];
  releases: ReleaseRow[];
  intakeText: string;
  intakeColor: string;
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

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Fallback labels for products with no live release data, by status. */
function fallbackVersionLabel(p: Product): { version: string; lastShipped: string } {
  if (p.fallbackVersion) return { version: p.fallbackVersion, lastShipped: relativeTime(p.fallbackDate) };
  switch (p.status) {
    case 'beta':
      return { version: 'beta', lastShipped: 'private beta' };
    case 'building':
      return { version: 'pre-release', lastShipped: p.siteUrl ? 'in development' : 'not deployed' };
    case 'maintained':
      return { version: 'stable', lastShipped: 'stable' };
    default:
      return { version: p.manualOnly ? 'external' : '—', lastShipped: p.manualOnly ? 'external · manual' : '—' };
  }
}

export async function getProjectDetail(slug: string): Promise<Detail> {
  const p = products.find((x) => x.slug === slug) ?? products[0];
  const path = p.repo && !p.manualOnly ? `${p.repo.owner}/${p.repo.name}` : null;

  // --- live GitHub (public repos always; private only with App access) ---
  let version = '';
  let lastShipped = '';
  let releases: ReleaseRow[] = [];
  let cycleName = '';
  let cycleSummary = '';
  let milestoneText = '';
  let progressText = '';
  let progress = 0;
  let cyclePhase = '';
  let done: string[] = [];
  let upcoming: string[] = [];

  if (path) {
    const rels = await gh<ApiRelease[]>(`/repos/${path}/releases`);
    const live = (rels ?? []).filter((r) => !r.draft);
    if (live.length) {
      version = live[0].tag_name;
      lastShipped = `shipped ${relativeTime(live[0].published_at)}`;
      releases = live.slice(0, 4).map((r) => ({
        version: r.tag_name,
        when: relativeTime(r.published_at),
        title: r.name || r.tag_name,
      }));
    }

    // null => couldn't read (private repo without App access / 404 / rate
    // limit) — leave the cycle empty so it degrades to the honest "no data"
    // state, NOT a fabricated "between phases". [] => read OK, genuinely none.
    const ms = await gh<ApiMilestone[]>(`/repos/${path}/milestones?state=open`);
    if (ms !== null) {
      const open = ms[0];
      if (open) {
        cycleName = open.title;
        cycleSummary = open.description?.trim() || 'Open milestone — issues in progress.';
        cyclePhase = 'in progress';
        const total = open.open_issues + open.closed_issues;
        progress = total ? Math.round((open.closed_issues / total) * 100) : 0;
        milestoneText = open.title;
        progressText = total ? `${open.closed_issues} / ${total} issues` : 'no issues';
        const [closed, openIssues] = await Promise.all([
          gh<ApiIssue[]>(`/repos/${path}/issues?milestone=${open.number}&state=closed&per_page=100`),
          gh<ApiIssue[]>(`/repos/${path}/issues?milestone=${open.number}&state=open&per_page=100`),
        ]);
        done = (closed ?? []).filter((i) => !i.pull_request).slice(0, 4).map((i) => i.title);
        upcoming = (openIssues ?? []).filter((i) => !i.pull_request).slice(0, 4).map((i) => i.title);
      } else {
        cycleName = 'between phases';
        cyclePhase = 'idle';
        cycleSummary = 'No open milestone right now.';
        milestoneText = 'no active milestone · between phases';
        progressText = version ? 'shipped' : '—';
        progress = version ? 100 : 0;
      }
    }
  }

  // --- fallbacks (private/no-repo/manual, or a GitHub miss) ---
  if (!version) {
    const fb = fallbackVersionLabel(p);
    version = fb.version;
    lastShipped = fb.lastShipped;
  }
  if (!cycleName) {
    cycleName = p.manualOnly ? 'external' : 'no data';
    cyclePhase = p.status;
    cycleSummary = p.manualOnly
      ? 'Tracked here for visibility; managed outside this account.'
      : 'No control-center data yet — connect the repo to populate this.';
    milestoneText = p.manualOnly ? 'external — manual entry' : 'no data';
    progressText = '—';
  }

  return {
    slug: p.slug,
    name: p.name,
    statusLabel: p.status.toUpperCase(),
    statusColor: statusColor(p.status),
    statusBg: statusBg(p.status),
    stealth: p.stealth === true,
    tagline: p.tagline,
    version,
    lastShipped,
    kindLabel: p.kind,
    siteUrl: p.siteUrl ?? null,
    siteHost: hostOf(p.siteUrl),
    repoLabel: p.repo ? `${p.repo.owner}/${p.repo.name}` : null,
    cycleName,
    cyclePhase,
    cycleSummary,
    milestoneText,
    progressText,
    progress,
    done,
    upcoming,
    releases,
    // Intake queue (proposals awaiting review) has no defined source yet —
    // QUESTIONS §4. Honest default until that mechanism is wired.
    intakeText: 'clear',
    intakeColor: '#3fb950',
  };
}
