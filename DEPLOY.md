# DEPLOY.md — deploy runbook

**Target:** **Vercel**, deploying the Astro app via the `@astrojs/vercel`
adapter. Public pages are prerendered to static HTML; the private `/admin`
plane and `/api/*` routes run server-side on Vercel (added in later v0.3.0
issues). See [DECISIONS.md](DECISIONS.md) ADR-009/010. **Supersedes the GitHub
Pages flow** (ADR-002/008 — retired).

## One-time setup (owner only)

1. **Create the Vercel project.** Vercel → **Add New → Project → Import** the
   `Nagoyashi/robpersonalwebsite` repo. Framework preset auto-detects **Astro**;
   build command `astro build` and output are handled by the adapter — accept
   the defaults. The first deploy gives a `*.vercel.app` preview URL.
2. **Custom domain.** Vercel → Project → **Settings → Domains → Add**
   `kissrobert.com`. Vercel shows the DNS records to set at the registrar:
   - apex `kissrobert.com` → `A` record to `76.76.21.21`, **or** a `CNAME`/ALIAS
     to `cname.vercel-dns.com` (use whichever the dashboard prints — it is
     authoritative over this doc).
   - Add `www` as a redirect to the apex if desired.
   - ⚠️ Until DNS propagates, browse the `*.vercel.app` URL.
3. **(Optional) Live data for PRIVATE repos** — the read-only GitHub App secrets
   (ADR-007), now set as **Vercel Environment Variables** (build-time) instead
   of GitHub Actions secrets. Without them, private repos (SabeValor, Pandavo)
   render `products.ts` fallbacks; public repos still fetch.
   - Vercel → Settings → **Environment Variables**: `FLEET_APP_ID`,
     `FLEET_APP_PRIVATE_KEY` (the full `.pem`). Scope: Production + Preview.
     Non-`PUBLIC_` names → never exposed to the client bundle.
4. **(Later issues) Server-plane secrets** — Supabase + GitHub OAuth env vars
   (`SUPABASE_*`, OAuth client id/secret) are added here in #23/#24, server-side
   only.

## Deploy procedure (per release)

1. Merge all changes (including `docs/releases/vX.Y.Z.md`) to `main` via PR.
2. Vercel's Git integration auto-deploys: **push to `main` → Production deploy**;
   **every PR → a Preview deploy** with its own URL (use these for parity checks).
3. Verify (below) on the Production URL.
4. Only after verification, push the annotated tag `vX.Y.Z` ("ship it") —
   `release.yml` then publishes the GitHub Release and closes the milestone.
   (Releasing is independent of deploying — Vercel already served the push.)

> **Daily data refresh.** The old Pages flow rebuilt daily via a cron in
> `deploy.yml` to refresh build-time GitHub fleet data. That cron is **retired
> with Pages**; the scheduled refresh is reconnected on Vercel in **#25**
> (Vercel Cron writing snapshots). Until #25 lands, fleet data refreshes only on
> each push-triggered deploy — flagged here so the gap isn't silent.

## Local build / preview

```
npm install        # once
npm run dev        # http://localhost:4321 (hot reload)
npm run build      # adapter output -> .vercel/output (static pages prerendered)
npm run preview    # serve the build locally
npm run check      # astro type-check
```
Locally, without the App secret, private-repo data falls back to `products.ts`;
public repos fetch unauthenticated.

## Per-deploy verification checklist

- [ ] Vercel deployment is **Ready** (Deployments tab), no build errors.
- [ ] Live URL loads the homepage with styling (no unstyled page).
- [ ] Fleet shows correct versions/status; `/now`, `/uses`, `/log` all load.
- [ ] Nav links resolve (no 404s); external links open correctly.
- [ ] Looks correct on mobile width.

## Backups

Not applicable for the public plane — it is **stateless** (source + git history
are the only state; product data is re-fetched at each build). Once the private
plane lands (#23), Supabase Postgres holds state and gets its own backup note.
