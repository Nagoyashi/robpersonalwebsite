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

- **Phase 4 — Control center** (`v0.3.0`, Phase A implemented). The site is now
  a **two-plane app** on Vercel (Pages retired): the public homepage plus a
  private, OAuth-gated **`/admin`** console. Landed this cycle: Vercel migration
  (ADR-010), Supabase Postgres + single-operator GitHub-OAuth gate (ADR-012),
  the Unified Ops View (snapshot-first, live fallback), the GitHub **connector +
  scheduled snapshots** (ADR-013), **uptime** monitoring + a real hero status
  badge, Notes/Marketing CRUD, and the **security baseline** (audit log + HTTP
  headers). Remaining before release: notes + tag.

## Roadmap (phases)

- **Phase 0 — Foundation & workflow.** ✅ CI, release automation, Dependabot,
  doc suite, Project board. (Implicit `v0.1.0` baseline on `main`.)
- **Phase 1 — Studio redesign + live fleet.** Astro rebuild + GitHub data layer.
  *(current — `v0.2.0`)*
- **Phase 2 — Depth & instant freshness.** [CONFIRM] `/work` case studies, a
  fuller `/about`, an OG share image, and **rebuild-on-release** (a
  `repository_dispatch` / deploy-hook fired from each product repo so the fleet
  updates instantly instead of daily). Touches other repos → separate gated work.
- **Phase 3 — Custom domain live.** [CONFIRM] Point `kissrobert.com` DNS — see
  the note under Phase 4: the domain now points at **Vercel**, not Pages.
- **Phase 4 — Control center (`v0.3.0`).** kissrobert.com becomes a two-plane
  system: the public site plus a private, authenticated **`/admin`** operations
  console — the operator's source of truth for progress, analytics, and control
  across all projects. **Phase A** (this cycle): migrate hosting to **Vercel**
  (retire Pages), **Supabase** Postgres + GitHub-OAuth login gating `/admin`,
  server connectors (reusing `github.ts`) + scheduled snapshots, and the
  **Unified Ops View** (one status line per project) — the scheduled work runs
  via **GitHub Actions** hitting cron endpoints, not Vercel Cron. Phases B–E
  (analytics depth,
  write-back control plane, AI fleet-digest, business/revenue metrics) follow.
  Decisions in [DECISIONS.md](DECISIONS.md) ADR-009…013; tasks on board #7. Built
  in TS with the Odysseus fork as a blueprint only (no AGPL graft).

## Deferred / explicitly out of scope this cycle

- ~~**Live up/down ping** for hosted apps~~ — **shipped** in Phase 3: the
  `/admin/uptime` monitor + a real hero status badge (#41).
- **Contact form** on the homepage — descoped (#40); the `mailto:` link suffices.
- **Rebuild-on-release** cross-repo wiring (Phase 2).
- **Private-repo auto-data** depends on the read-only GitHub App being installed
  and its secrets added (see [DEPLOY.md](DEPLOY.md)); until then private repos
  (SabeValor, Pandavo) render `products.ts` fallbacks.

## Phase log (newest first)

- *(none yet — first release cycle not closed)*
