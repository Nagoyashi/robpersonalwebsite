# DECISIONS.md — architecture decision log

One entry per significant choice. Each is marked **[CONFIRM]** where inferred
from the codebase rather than told to me — please verify.

---

## ADR-001 — Plain static HTML/CSS, no framework or build step [CONFIRM]

> **⚠️ Superseded by ADR-005 (2026-06-20).** The "Connection to GitHub"
> feature needs a build step (fetch GitHub data at build, never in the
> browser), so the site moved to Astro. The *spirit* survives: zero client JS
> by default, no SPA bloat, still a fast static output.

- **Context.** The site is a small personal portfolio (`index.html` +
  `style.css`), with no manifests of any kind in the repo.
- **Decision.** Keep it as hand-written static HTML5/CSS3 — no framework, no
  bundler, no package manager.
- **Rationale.** Zero dependencies = instant load, no build/maintenance burden,
  openable by double-clicking, trivially hostable on any static host.
- **Revisit when.** Content grows enough that templating/components would
  meaningfully reduce duplication, or interactivity needs a real toolchain.

## ADR-002 — Deploy via GitHub Pages [CONFIRM]

> **Amended by ADR-008 (2026-06-20).** Still GitHub Pages, but the source
> changes from "deploy from a branch" to "GitHub Actions" — Pages can't run the
> Astro build, so a workflow builds and uploads the artifact. Custom domain
> `kissrobert.com` is now set via `public/CNAME`.
>
> **⚠️ To be superseded by ADR-010 (planned, v0.3.0).** The control center
> needs a backend; the whole site moves to **Vercel** and Pages is retired. Do
> not finalize the Pages DNS in the meantime.

- **Context.** No deploy target was configured; a static host is needed.
- **Decision.** Serve `main` (root) via GitHub Pages.
- **Rationale.** Free for public repos, zero-config for a root `index.html`,
  auto-publishes on push — matches the "no build step" model. Board is named
  "kissrobert.com", suggesting a custom domain later.
- **Revisit when.** A custom domain/CDN, build-time processing, or preview
  deploys per PR are needed.

## ADR-003 — main-only branch model [CONFIRM]

- **Context.** Single maintainer, no staging environment.
- **Decision.** `feature/* → main` via PR; tag the `main` commit after the
  GitHub Pages deploy is verified.
- **Rationale.** Simplest model that still enforces review + CI; no need for a
  `develop` staging branch without a separate staging environment.
- **Revisit when.** A staging environment or multiple contributors appear.

## ADR-004 — CI validates structure + local links, not external URLs [CONFIRM]

> **Amended by ADR-005 (2026-06-20).** With Astro, the `validate` job now runs
> `astro check` (types) + `astro build`. A successful build *is* the structural
> guarantee — templates compile, content parses, internal links resolve. The
> name `validate` is kept so the required-check contract is unchanged. CI builds
> **without** the App secret, which also proves the data layer's graceful
> fallback. External URLs are still not fetched.

- **Context.** There is no test suite; the failure modes of a static page are
  malformed HTML and broken local references.
- **Decision.** `ci.yml` (`validate` job) checks HTML tag balance and that
  every local `href`/`src` resolves; it deliberately does **not** fetch
  external URLs.
- **Rationale.** A meaningful, fast, deterministic gate. Fetching external
  links (LinkedIn, GitHub, autory.io) would make the required check flaky.
- **Revisit when.** A real test/lint toolchain is adopted, or a scheduled
  (non-blocking) external link-checker is wanted.

---

## ADR-005 — Adopt Astro + a build step

- **Context.** The site needs to show live GitHub data (versions, releases,
  open milestones) without client-side fetching (which would be slow, hurt SEO,
  and risk leaking any token). That requires building the pages from data at
  build time, which ADR-001's "no build step" rule forbade.
- **Decision.** Rebuild the site in **Astro**. Content pages (`/now`, `/uses`)
  are Markdown; everything ships **zero JS by default**; interactive islands are
  added only where genuinely needed.
- **Rationale.** Astro keeps the output as fast as the old static site while
  giving clean, typed module boundaries (`src/config/products.ts`,
  `src/lib/github.ts`) and Markdown content — without SPA bloat. It matches the
  "lean and ownable" ethos better than a hand-rolled templating script.
- **Revisit when.** The build/dependency burden outgrows the value, or a
  simpler generator would do.

## ADR-006 — Build-time GitHub data layer; `products.ts` is the source of truth

- **Context.** Robert intends to take product repos private (some open / partly
  open-source). Data and links must survive any repo flipping visibility.
- **Decision.** `src/config/products.ts` is the **single source of truth**
  (hand-maintained status/version/links). `src/lib/github.ts` is a build-time-
  only enrichment layer that overwrites version/last-shipped/log/"currently
  shipping" with live data for any repo it can read, and **falls back to the
  config** on any failure. Cards link to the deployed `siteUrl`; a repo link
  shows only where `repo.public === true`.
- **Rationale.** One place data enters the site; the fleet always renders;
  visibility changes never break the build. Mirrors the single-source pattern
  the repo already favours. **No invented metrics** — unknowns render as
  placeholders, never fabricated.
- **Revisit when.** A CMS or per-product detail pages need richer data.

## ADR-007 — Live data via a read-only GitHub App; secrets are build-only

- **Context.** Private repos can't be read unauthenticated. A token is needed,
  but **no secret may ever reach the client bundle**.
- **Decision.** Use a **read-only GitHub App** (Contents: read, Issues: read,
  Metadata: read) installed on the `Nagoyashi` account. The deploy workflow
  mints a short-lived installation token via `actions/create-github-app-token`
  and passes it to the build as `FLEET_GITHUB_TOKEN` — a **non-`PUBLIC_`** env
  var, so Astro never bundles it. App ID + private key live only as Actions
  secrets (`FLEET_APP_ID`, `FLEET_APP_PRIVATE_KEY`).
- **Rationale.** App install is cleaner than a PAT, scoped and revocable, reads
  public + private uniformly. Build-time-only use means zero client exposure and
  the 60/hr unauthenticated limit is irrelevant.
- **Revisit when.** Fine-grained PATs become easier, or more scopes are needed.

## ADR-008 — Freshness via scheduled rebuild; deploy via Pages + Actions

- **Context.** Build-time data goes stale between deploys. Pages "deploy from a
  branch" can't run an Astro build.
- **Decision.** `deploy.yml` builds the site and publishes to **GitHub Pages via
  Actions**, on push to `main`, on a **daily cron** (refreshes GitHub-sourced
  data with zero cross-repo wiring), and on manual dispatch.
- **Rationale.** The cron keeps the fleet "fresh enough" without touching other
  repos. Simple and self-contained.
- **Revisit when.** Instant updates are wanted — upgrade to a `repository_
  dispatch` / deploy-hook fired from each product repo's release workflow. That
  touches other repos, so it's a separate, gated follow-up (tracked in
  project.md), not part of this cycle.

---

# Control center (v0.3.0) — decisions

> The following ADRs are **Accepted, not yet implemented**. They record the
> direction for turning kissrobert.com into a public site + private `/admin`
> operations console. Target milestone: `v0.3.0` (Phase A). Each carries an
> [ASK ME] gate at implementation time (hosting change, secrets, auth, merges).

## ADR-009 — Two-plane architecture: public static + private `/admin`

- **Status.** Accepted, not yet implemented (v0.3.0).
- **Context.** kissrobert.com should become the operator's control center —
  progress, analytics, and control across all of Robert's projects — without
  compromising the fast, secret-free public site.
- **Decision.** Split into two planes in one Astro app: a **public plane**
  (prerendered, no secrets — the site as today) and a **private plane** at
  `/admin` (server-rendered + API routes, authenticated, with a database and
  server-side secrets).
- **Rationale.** Keeps the public site's guarantees intact while letting the
  admin be a stateful, secret-holding app. The "no secrets in the client" rule
  is preserved (now scoped: public plane has none; private plane keeps them
  server-side only). "No invented metrics" becomes even more load-bearing.
- **Revisit when.** The admin outgrows a single app and warrants its own service.

## ADR-010 — Host the whole site on Vercel; retire GitHub Pages

- **Status.** Accepted, not yet implemented (v0.3.0). **Supersedes ADR-002/008.**
- **Context.** A control center needs SSR, serverless API routes, scheduled jobs,
  and secrets — none of which GitHub Pages can serve.
- **Decision.** Deploy the entire site (public + `/admin`) on **Vercel** under
  `kissrobert.com`; point DNS at Vercel; disable GitHub Pages. Public routes are
  prerendered; `/admin` and `/api/*` run server-side.
- **Rationale.** One host, one domain, one deploy; first-class Astro support;
  Vercel Cron for scheduled data refresh; native env-var secret management.
- **Revisit when.** Cost, lock-in, or data-sovereignty needs push toward self-
  hosting (a VPS/Docker was the considered alternative).

## ADR-011 — Supabase (Postgres + Auth) as the control-center datastore

- **Status.** Accepted, not yet implemented (v0.3.0).
- **Context.** The control center needs a source-of-truth database (metric
  snapshots, connector config, audit log) and authentication.
- **Decision.** Use **Supabase** — Postgres for data, Supabase Auth for login.
- **Rationale.** Already used across Robert's other products (one less stack to
  learn); managed Postgres; integrates with Vercel; service keys stay server-side.
- **Revisit when.** Self-hosting Postgres or a different auth provider is wanted.

## ADR-012 — `/admin` auth: GitHub OAuth, single-operator allowlist

- **Status.** Accepted, not yet implemented (v0.3.0).
- **Context.** Only Robert logs in; the admin controls sensitive operations.
- **Decision.** Authenticate via **GitHub OAuth** (Supabase Auth), **allowlisted
  to Robert's GitHub account only**. Audit-log control actions.
- **Rationale.** No passwords; same identity that owns the repos and the GitHub
  App; simplest strong option for one operator. (Passkeys / magic-link+TOTP were
  the considered alternatives.)
- **Revisit when.** More users need access, or stronger/phishing-resistant auth
  (passkeys) is preferred.

## ADR-013 — Control-center data layer: connector registry + central DB

- **Status.** Accepted; GitHub pull connector + snapshotting implemented in
  v0.3.0 (#25).
- **Context.** Data must flow in from many projects (GitHub, web analytics,
  uptime, revenue) and feed dashboards — and later flow back out as control
  actions. The Odysseus fork (AGPL-3.0, Python/FastAPI) has an excellent
  connector/MCP pattern and schema, but a direct graft would impose AGPL (repos
  are going private) and a second stack.
- **Decision.** Build a **typed connector registry** in TypeScript — each source
  is a `fetch() → normalized records` module (`src/lib/ctrl/connectors/*`)
  writing normalized rows into the central Postgres `snapshots` table. **Pull**
  connectors first (GitHub, via `connectors/github.ts` — `githubOps()`); **push**
  ingestion (per-project API keys) and **write-back** (a read-WRITE GitHub App)
  come in later phases. Odysseus is used as a **blueprint only**, not grafted —
  so the code stays closed and AGPL-free.
- **Scheduling.** A **scheduled GitHub Action** (`.github/workflows/snapshot.yml`)
  hits the secret-protected `/api/cron/snapshot` endpoint hourly — **not** Vercel
  Cron (which needs Pro for sub-daily runs). Same pattern as the uptime pinger.
- **Read path.** The Overview page reads **snapshot-first** (latest row from
  `snapshots`), falling back to a **live** connector fetch, then to `products.ts`
  — so the dashboard stays fast and survives a GitHub outage/rate limit.
  Connector targets are derived from `products.ts` (the source of truth); the
  `connector_config` registry stays available for per-project overrides but isn't
  required to run.
- **Rationale.** One place data enters (mirrors `products.ts`); resilient
  (snapshots survive a source outage); coherent single TS stack; no AGPL
  entanglement. Every metric must trace to a real source — no fabricated numbers.
- **Revisit when.** A real ETL/observability platform would do better than
  hand-rolled connectors.

## ADR-014 — Self-host fonts (drop the Google Fonts CDN)

- **Status.** Accepted, implemented (v0.3.0).
- **Context.** `Base.astro` loaded JetBrains Mono + Poppins from Google's CDN
  (`fonts.googleapis.com`/`gstatic.com`). That transmits every visitor's IP to
  Google on each page load — which a German court (LG München, 2022) ruled a
  GDPR violation absent consent. The site is going live under `kissrobert.com`
  and needs an imprint/privacy baseline, so a third-party request that leaks IPs
  is the wrong default.
- **Decision.** Self-host the exact weights via **`@fontsource`**
  (`@fontsource/jetbrains-mono` 400/500/700, `@fontsource/poppins` 300/400/600).
  Fonts are bundled and served from our own origin; **no client request ever
  goes to Google**. The Google `<link>`/`preconnect` are removed.
- **Rationale.** Removes the IP leak (privacy), eliminates render-blocking
  third-party requests (perf — *better* for the budget, not worse), and keeps
  the "no client-side third-party" spirit. `@fontsource` is a static-asset
  dependency, not a framework — within the lean-dependency contract.
- **Revisit when.** Astro's first-party Fonts API leaves experimental, at which
  point it could replace `@fontsource` with zero dependencies.

## ADR-015 — Control-center AI layer: scheduled digest + pgvector ops memory

- **Status.** Proposed (v0.4.0, #58). Foundation for #59–#62.
- **Context.** v0.3.0 made the control center a *viewer* (Ops View, uptime,
  snapshots). v0.4.0 makes it *tell you things*: a daily "state of the fleet"
  brief and an ops memory it can draw on. Odysseus (AGPL, **blueprint only** —
  ADR-013) runs the same shape (scheduled agent tasks + LLM synthesis + vector
  memory + notifications) in Python; we re-implement the pattern in the TS stack.
- **Decision.**
  - **Scheduling** reuses the ADR-013 mechanism: a **scheduled GitHub Action**
    hits a secret-protected `/api/cron/digest` endpoint (`CRON_SECRET`, as with
    `ping`/`snapshot`). **Not** Vercel Cron (Pro-gated for sub-daily) — though a
    once-daily digest *could* run on Hobby Vercel Cron, we keep one scheduling
    mechanism across the app.
  - **Model.** Anthropic **Claude API**, server-side only (key is a non-`PUBLIC_`
    env var; ADR-007 posture — never in the client bundle). Default
    `claude-opus-4-8`; the tier is the operator's call (a once-daily digest is
    cheap at any tier — `claude-sonnet-4-6`/`claude-haiku-4-5` are cheaper if
    wanted). No model downgrade "for cost" is baked in.
  - **Ops memory** lives in **Supabase `pgvector`** — a native extension, so an
    embeddings table + a similarity query, **no separate vector DB** (Odysseus
    uses ChromaDB because it's self-hosted Python; we don't need a second
    service). Deny-by-default RLS, service-role only (as with every ctrl table,
    #23).
  - **Embeddings.** Anthropic has **no embeddings API**, so the vector source is
    decided separately at #59: default to Supabase's in-database **`gte-small`**
    (kept in-stack, no new vendor), with a hosted provider (e.g. Voyage) as the
    upgrade if recall proves weak. Recorded here so the choice is deliberate.
  - **Honesty.** The AI layer only summarizes **real** snapshot/uptime/DB data —
    every claim traces to a source; no fabricated metrics (carries the ADR-013
    rule into the AI layer).
- **Rationale.** One scheduling mechanism, one datastore (Supabase does vectors
  too), one model provider, secrets server-only — consistent with the existing
  private plane. Turns the cockpit from passive to proactive without a second
  stack or an AGPL graft.
- **Revisit when.** Scheduled work outgrows fire-and-forget cron endpoints (needs
  retries/queues/observability), or a managed agent runtime would beat
  hand-rolled synthesis.
