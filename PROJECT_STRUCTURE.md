# PROJECT_STRUCTURE.md — file map & code placement

**Single-document-ownership rule:** each fact lives in exactly one doc. Don't
duplicate content across files — link instead.

The site is an **Astro** project (see [DECISIONS.md](DECISIONS.md) ADR-005),
hosted on **Vercel** via the `@astrojs/vercel` adapter (ADR-010). It is a
**two-plane app** (ADR-009):

- **Public plane** — prerendered to static HTML, zero client JS by default,
  stateless. Fleet data is fetched at **build time** in `src/lib/github.ts`.
- **Private plane** — the authenticated `/admin` control center + `/api/*`
  routes, **server-rendered** on Vercel (`export const prerender = false`),
  reading/writing Supabase Postgres. Gated by `src/middleware.ts` (ADR-012).

## Top-level tree

```
robpersonalwebsite/
├── astro.config.mjs        # Astro config: site URL, sitemap, Vercel adapter.
├── vercel.json             # HTTP security headers (baseline, both planes — #27).
├── package.json            # Scripts (dev/build/preview/check) + deps.
├── tsconfig.json           # Strict TS config (extends astro/tsconfigs/strict).
├── src/
│   ├── config/
│   │   ├── products.ts     # SINGLE SOURCE OF TRUTH for the fleet (hand-maintained).
│   │   └── site.ts         # Site-wide flags (e.g. COMING_SOON gate).
│   ├── env.d.ts            # Ambient types (incl. App.Locals: the audit-log operator).
│   ├── middleware.ts       # Gates /admin: OAuth allowlist, fails closed (ADR-012).
│   ├── lib/
│   │   ├── github.ts       # PUBLIC plane: build-time-only GitHub fetchers + fallback.
│   │   ├── format.ts       # Date / status-label helpers.
│   │   └── ctrl/           # PRIVATE plane data layer (server-only; never client).
│   │       ├── auth.ts     # Supabase GitHub-OAuth client + allowlist (ADR-012).
│   │       ├── db.ts       # Service-role Postgres access: notes, marketing,
│   │       │               #   uptime, snapshots, audit log (deny-by-default RLS).
│   │       ├── overview.ts # Unified Ops View: snapshot-first, live fallback.
│   │       ├── monitors.ts # Uptime targets derived from products.ts.
│   │       └── connectors/
│   │           └── github.ts # Pull connector: GitHub → normalized OpsMetrics (ADR-013).
│   ├── content.config.ts   # Content collection schema (the `pages` collection).
│   ├── content/            # /now + /uses Markdown sources.
│   ├── layouts/
│   │   ├── Base.astro      # PUBLIC shell: head/SEO/OG, self-hosted fonts, nav, footer.
│   │   └── AdminShell.astro# PRIVATE shell: sidebar, control-center chrome.
│   ├── components/
│   │   ├── *.astro         # Public pieces (Nav, Footer, FleetCard, StatusPill, …).
│   │   └── admin/          # Control-center pieces (Sidebar, PageHeader).
│   ├── pages/
│   │   ├── index.astro     # Homepage (hero + status badge, fleet, now, contact mailto).
│   │   ├── now/uses/log/…  # Public pages + imprint, privacy (all prerendered).
│   │   ├── robots.txt.ts   # Generated robots.txt.
│   │   ├── admin/          # PRIVATE plane (prerender = false, gated):
│   │   │   ├── index.astro #   Overview / Unified Ops View.
│   │   │   ├── login.astro #   OAuth entry (open — no redirect loop).
│   │   │   ├── notes|marketing|uptime|analytics|ideation.astro
│   │   │   ├── auth/       #   signin / callback / signout.
│   │   │   └── api/        #   CRUD JSON routes (notes, marketing, seo) — audited.
│   │   └── api/cron/       # Cron endpoints (NOT under /admin; CRON_SECRET-gated):
│   │       ├── ping.ts     #   uptime pinger (#Phase 3).
│   │       └── snapshot.ts #   GitHub ops snapshotter (ADR-013, #25).
│   └── styles/
│       └── global.css      # All public styling (the single stylesheet).
├── public/                 # Copied verbatim to the site root (favicon, og.png, …).
├── supabase/
│   ├── config.toml         # Supabase CLI project config.
│   └── migrations/         # Ordered SQL migrations (control-center schema).
├── docs/
│   └── releases/           # One file per release (source of GitHub Releases).
└── .github/
    ├── workflows/
    │   ├── ci.yml          # `validate` — astro check + build (no secret).
    │   ├── release.yml     # Tag-triggered Release publisher + milestone closer.
    │   ├── uptime.yml      # Hourly-ish cron → /api/cron/ping (Phase 3).
    │   └── snapshot.yml    # Hourly cron → /api/cron/snapshot (ADR-013, #25).
    └── dependabot.yml      # Weekly updates (github-actions + npm).
```

> Deploy is Vercel's Git integration (push `main` → Production), **not** a
> workflow — the old `deploy.yml` Pages flow is retired (ADR-010). See
> [DEPLOY.md](DEPLOY.md).

## Where new code/content belongs

- **Fleet/product data** → `src/config/products.ts` (the only place). Never
  hardcode product facts in a component or page.
- **Public-plane GitHub data** → `src/lib/github.ts`, **build-time only**. Never
  fetch GitHub from the browser; never read a token outside this module.
- **Private-plane data / connectors** → `src/lib/ctrl/` (server-only). Anything
  touching Supabase or a secret lives here and is imported **only** from
  `prerender = false` routes — never from a public page (keeps `db.ts`/tokens out
  of the static build). New sources → `src/lib/ctrl/connectors/` (ADR-013).
- **Every /admin mutation** → write an audit-log entry (`db.audit`, actor from
  `Astro.locals.operator`); protect via the middleware gate, never per-route auth.
- **Cron / scheduled work** → a `src/pages/api/cron/*` endpoint (`CRON_SECRET`-
  gated) + a scheduled GitHub Action in `.github/workflows/` that hits it. Not
  Vercel Cron (needs Pro for sub-daily runs — ADR-013).
- **DB schema changes** → a new ordered file in `supabase/migrations/`
  (RLS-on, deny-by-default; service-role is the only way in).
- **Page markup / sections** → `src/pages/*.astro` (compose) and
  `src/components/*.astro` (reusable pieces); `src/components/admin/` for the
  private plane.
- **Long-form content** (now, uses) → Markdown in `src/content/`.
- **Public styling** → `src/styles/global.css` (the single stylesheet). Admin
  pages style inline within their `.astro` files.
- **Static assets** → `public/` (served from root).
- **HTTP headers** → `vercel.json`. **Release notes** → `docs/releases/vX.Y.Z.md`.
- **New automation** → `.github/workflows/`. New dependency ecosystems → a new
  block in `.github/dependabot.yml`.
