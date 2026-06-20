# DECISIONS.md — architecture decision log

One entry per significant choice. Each is marked **[CONFIRM]** where inferred
from the codebase rather than told to me — please verify.

---

## ADR-001 — Plain static HTML/CSS, no framework or build step [CONFIRM]

- **Context.** The site is a small personal portfolio (`index.html` +
  `style.css`), with no manifests of any kind in the repo.
- **Decision.** Keep it as hand-written static HTML5/CSS3 — no framework, no
  bundler, no package manager.
- **Rationale.** Zero dependencies = instant load, no build/maintenance burden,
  openable by double-clicking, trivially hostable on any static host.
- **Revisit when.** Content grows enough that templating/components would
  meaningfully reduce duplication, or interactivity needs a real toolchain.

## ADR-002 — Deploy via GitHub Pages [CONFIRM]

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

- **Context.** There is no test suite; the failure modes of a static page are
  malformed HTML and broken local references.
- **Decision.** `ci.yml` (`validate` job) checks HTML tag balance and that
  every local `href`/`src` resolves; it deliberately does **not** fetch
  external URLs.
- **Rationale.** A meaningful, fast, deterministic gate. Fetching external
  links (LinkedIn, GitHub, autory.io) would make the required check flaky.
- **Revisit when.** A real test/lint toolchain is adopted, or a scheduled
  (non-blocking) external link-checker is wanted.
