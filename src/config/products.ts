/**
 * products.ts — THE SINGLE SOURCE OF TRUTH for the fleet.
 *
 * Every value here is hand-maintained and authoritative. `src/lib/github.ts`
 * may ENRICH these at build time (live version / last-shipped / releases /
 * open milestones) for any repo it can read — but if a fetch fails, is rate-
 * limited, or the repo is private with no token, the values below are what
 * renders. The site therefore survives any repo going public <-> private.
 *
 * RULES (Robert's):
 *  - No invented metrics, user counts, or claims. If something is unknown,
 *    leave it null and it renders as a placeholder — never fabricate.
 *  - Cards link to the DEPLOYED siteUrl by default. A repo link is shown ONLY
 *    where repo.public === true.
 */

export type ProductStatus =
  | 'live' // hosted app, in production
  | 'beta' // hosted, early access / soft-gated
  | 'building' // actively in development, not yet shipped/hosted
  | 'maintained' // shipped tool, stable, low-frequency updates
  | 'archived'; // no longer maintained

export type ProductKind = 'app' | 'cli' | 'service' | 'library';

export interface RepoRef {
  owner: string;
  name: string;
  /** true => show a repo link and (publicly) fetch without a token */
  public: boolean;
}

export interface Product {
  slug: string;
  name: string;
  /** one-line description — no metrics, no claims */
  tagline: string;
  status: ProductStatus;
  kind: ProductKind;
  /** deployed site / primary outbound link; null if nothing public to link */
  siteUrl?: string | null;
  /** backing repo, or null for external/no-repo products */
  repo?: RepoRef | null;
  flagship?: boolean;
  /** shown when no live release/tag data is available */
  fallbackVersion?: string | null;
  /** ISO date shown when no live last-shipped data is available */
  fallbackDate?: string | null;
  /** external/manual entry — never attempt a GitHub fetch */
  manualOnly?: boolean;
  /** set false to exclude from the public fleet (e.g. internal tooling) */
  include?: boolean;
  /** control-center only: mark as stealth (◈ badge in /admin). Never affects
   *  the public plane; public visibility is governed by `include`. */
  stealth?: boolean;
}

export const products: Product[] = [
  {
    slug: 'spreadsheet-millionaire',
    name: 'SpreadsheetMillionaire',
    tagline:
      'Personal-finance calculators — FIRE, compound interest, emergency fund, debt payoff — usable instantly, no signup.',
    status: 'live',
    kind: 'app',
    siteUrl: 'https://www.spreadsheetmillionaire.com',
    repo: { owner: 'Nagoyashi', name: 'spreadsheet-millionaire', public: false }, // private repo — no public repo link; live data needs the App token
    flagship: true,
    fallbackVersion: 'v0.9.0',
    fallbackDate: '2026-06-20',
  },
  {
    slug: 'sabevalor',
    name: 'SabeValor',
    tagline:
      'Instant property valuations for the Portuguese market; qualified seller leads routed to AMI-licensed agencies.',
    status: 'beta',
    kind: 'app',
    siteUrl: 'https://sabevalor.com',
    repo: { owner: 'Nagoyashi', name: 'sabevalor', public: false },
    fallbackVersion: null, // no releases cut yet
    fallbackDate: null,
    include: false, // stealth during private beta — hidden from the public fleet
    stealth: true, // control-center: ◈ stealth
  },
  {
    slug: 'cutecumber',
    name: 'Cutecumber',
    tagline: 'A privacy-first, tracker-free link-in-bio service. Built with Flask + SQLite.',
    status: 'live',
    kind: 'app',
    siteUrl: 'https://cutecumber.cc',
    repo: { owner: 'Nagoyashi', name: 'cutecumber', public: true },
    fallbackVersion: 'v0.2.0',
    fallbackDate: '2026-06-20',
  },
  {
    slug: 'pandavo',
    name: 'Pandavo',
    tagline:
      'WhatsApp Business support platform — shared inbox, ticketing, and AI message triage. Built with NestJS + React.',
    status: 'building',
    kind: 'service',
    siteUrl: null, // not deployed yet
    repo: { owner: 'Nagoyashi', name: 'pandavo', public: false },
    fallbackVersion: null,
    fallbackDate: null,
  },
];

/** The fleet shown publicly (excludes opt-out entries). */
export const fleet: Product[] = products.filter((p) => p.include !== false);
