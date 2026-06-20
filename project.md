# project.md — roadmap & strategy

Phase-level status only. Per-task status lives on **board #7**; rationale lives
in [DECISIONS.md](DECISIONS.md).

## Vision

A fast, accessible **solo software-studio homepage** for Robert Kiss. It asserts
the operator identity ("I design, build, and run software products. Solo.") and
puts a **live fleet** of products front and centre — status, version, and
last-shipped pulled from GitHub at build time. Loads fast, ships zero JS by
default, and is honest: real data only, no invented metrics.

## Current phase + status

- **Phase 1 — Studio redesign + live fleet** (in progress, `v0.2.0`).
  Rebuilt on Astro with a build-time GitHub data layer (`products.ts` source of
  truth + `github.ts` enrichment), the homepage sections (hero, fleet, now, log,
  about, contact), and `/now` `/uses` `/log` pages. Deploy moves to GitHub Pages
  via Actions with a daily rebuild.

## Roadmap (phases)

- **Phase 0 — Foundation & workflow.** ✅ CI, release automation, Dependabot,
  doc suite, Project board. (Implicit `v0.1.0` baseline on `main`.)
- **Phase 1 — Studio redesign + live fleet.** Astro rebuild + GitHub data layer.
  *(current — `v0.2.0`)*
- **Phase 2 — Depth & instant freshness.** [CONFIRM] `/work` case studies, a
  fuller `/about`, an OG share image, and **rebuild-on-release** (a
  `repository_dispatch` / deploy-hook fired from each product repo so the fleet
  updates instantly instead of daily). Touches other repos → separate gated work.
- **Phase 3 — Custom domain live.** [CONFIRM] Point `kissrobert.com` DNS at
  Pages and verify (CNAME already in `public/`).

## Deferred / explicitly out of scope this cycle

- **Live up/down ping** for hosted apps (status is config-driven in v1).
- **Rebuild-on-release** cross-repo wiring (Phase 2).
- **Private-repo auto-data** depends on the read-only GitHub App being installed
  and its secrets added (see [DEPLOY.md](DEPLOY.md)); until then private repos
  (SabeValor, Pandavo) render `products.ts` fallbacks.

## Phase log (newest first)

- *(none yet — first release cycle not closed)*
