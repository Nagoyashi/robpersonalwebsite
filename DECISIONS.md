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
