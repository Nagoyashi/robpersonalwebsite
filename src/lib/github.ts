/**
 * github.ts — BUILD-TIME ONLY GitHub data layer.
 *
 * Runs during `astro build`, never in the browser. Auth (if present) comes from
 * a build/CI secret minted from a read-only GitHub App; it is read here as a
 * plain (non-PUBLIC_) env var so it is NEVER bundled to the client.
 *
 * Every fetch is wrapped in a timeout + try/catch. On ANY failure we fall back
 * to the hand-maintained values in products.ts, so a GitHub hiccup, a rate
 * limit, or a private repo without a token can never break the build or empty
 * the fleet.
 */
import type { Product } from '../config/products';

const API = 'https://api.github.com';
const TIMEOUT_MS = 8000;

// Build-only token. FLEET_GITHUB_TOKEN = GitHub App installation token (CI).
// GITHUB_TOKEN is the Actions default; either works. Absent locally => public,
// unauthenticated requests (fine for public repos during dev).
const TOKEN = process.env.FLEET_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';

async function gh<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'kissrobert-site-build',
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

function repoPath(p: Product): string | null {
  if (!p.repo || p.manualOnly) return null;
  return `${p.repo.owner}/${p.repo.name}`;
}

interface ApiRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
}
interface ApiTag {
  name: string;
}
interface ApiMilestone {
  title: string;
  html_url: string;
  open_issues: number;
}

export interface VersionInfo {
  version: string | null;
  date: string | null; // ISO
  url: string | null;
}

/** Latest version + last-shipped for one product: releases/latest -> tags -> config fallback. */
export async function latestVersion(p: Product): Promise<VersionInfo> {
  const path = repoPath(p);
  const fallback: VersionInfo = {
    version: p.fallbackVersion ?? null,
    date: p.fallbackDate ?? null,
    url: null,
  };
  if (!path) return fallback;

  const rel = await gh<ApiRelease>(`/repos/${path}/releases/latest`);
  if (rel?.tag_name) {
    return { version: rel.tag_name, date: rel.published_at, url: rel.html_url };
  }
  const tags = await gh<ApiTag[]>(`/repos/${path}/tags`);
  if (tags && tags.length > 0) {
    return { version: tags[0].name, date: null, url: `https://github.com/${path}/tags` };
  }
  return fallback;
}

export interface ReleaseInfo {
  product: string;
  repo: string;
  tag: string;
  title: string;
  date: string | null; // ISO
  url: string;
  prerelease: boolean;
}

/** Recent releases flattened across all repo-backed products, newest first. */
export async function recentReleases(items: Product[], limit = 5): Promise<ReleaseInfo[]> {
  const repoItems = items.filter((p) => repoPath(p));
  const lists = await Promise.all(
    repoItems.map(async (p) => {
      const path = repoPath(p)!;
      const rels = await gh<ApiRelease[]>(`/repos/${path}/releases`);
      if (!rels) return [] as ReleaseInfo[];
      return rels
        .filter((r) => !r.draft)
        .map<ReleaseInfo>((r) => ({
          product: p.name,
          repo: path,
          tag: r.tag_name,
          title: r.name || r.tag_name,
          date: r.published_at,
          url: r.html_url,
          prerelease: r.prerelease,
        }));
    }),
  );
  return lists
    .flat()
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, limit);
}

export interface ShippingInfo {
  product: string;
  title: string;
  url: string;
}

/** Open milestones across repo-backed products => "currently shipping". */
export async function currentlyShipping(items: Product[]): Promise<ShippingInfo[]> {
  const repoItems = items.filter((p) => repoPath(p));
  const lists = await Promise.all(
    repoItems.map(async (p) => {
      const path = repoPath(p)!;
      const ms = await gh<ApiMilestone[]>(`/repos/${path}/milestones?state=open`);
      if (!ms) return [] as ShippingInfo[];
      return ms.map<ShippingInfo>((m) => ({ product: p.name, title: m.title, url: m.html_url }));
    }),
  );
  return lists.flat();
}

export interface FleetItem extends Product {
  version: string | null;
  lastShipped: string | null; // ISO
  releaseUrl: string | null;
  repoUrl: string | null; // only when repo.public
}

/** Build the enriched fleet: config + live version/date, repo link iff public. */
export async function buildFleet(items: Product[]): Promise<FleetItem[]> {
  return Promise.all(
    items.map(async (p) => {
      const v = await latestVersion(p);
      const repoUrl =
        p.repo && p.repo.public ? `https://github.com/${p.repo.owner}/${p.repo.name}` : null;
      return { ...p, version: v.version, lastShipped: v.date, releaseUrl: v.url, repoUrl };
    }),
  );
}

/** One call for the homepage: fleet + recent log + currently-shipping. */
export async function getSiteData(items: Product[]) {
  const [fleetItems, releases, shipping] = await Promise.all([
    buildFleet(items),
    recentReleases(items, 5),
    currentlyShipping(items),
  ]);
  return { fleet: fleetItems, releases, shipping, authenticated: Boolean(TOKEN) };
}
