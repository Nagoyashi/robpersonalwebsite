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
3. **(Optional) Live data for PRIVATE repos** — a read-only GitHub App
   installation token (ADR-007), set as a **Vercel Environment Variable**.
   Without it, private repos (SabeValor, Pandavo) render `products.ts`
   fallbacks; public repos still fetch. Read by both `src/lib/github.ts`
   (build-time) and the server connector.
   - Vercel → Settings → **Environment Variables**: `FLEET_GITHUB_TOKEN` (the
     installation token). Scope: Production + Preview. Non-`PUBLIC_` name → never
     exposed to the client bundle.
4. **Server-plane secrets** (private plane — set as Vercel env vars, server-only,
   no `PUBLIC_` prefix; full contract in [`.env.example`](.env.example)):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — Postgres +
     auth (ADR-011).
   - `ADMIN_GITHUB_LOGIN` — the single GitHub login allowed into `/admin` (ADR-012).
   - `CRON_SECRET` — protects `/api/cron/ping` + `/api/cron/snapshot`; set the
     **same** value as a **GitHub repo secret** (the Actions send it). Also add
     repo **variable** `CTRL_PING_URL` = the deployed origin (e.g.
     `https://kissrobert.com`) so the cron Actions know where to call.

## Deploy procedure (per release)

1. Merge all changes (including `docs/releases/vX.Y.Z.md`) to `main` via PR.
2. Vercel's Git integration auto-deploys: **push to `main` → Production deploy**;
   **every PR → a Preview deploy** with its own URL (use these for parity checks).
3. Verify (below) on the Production URL.
4. Only after verification, push the annotated tag `vX.Y.Z` ("ship it") —
   `release.yml` then publishes the GitHub Release and closes the milestone.
   (Releasing is independent of deploying — Vercel already served the push.)

> **Data refresh.** The *public* homepage's fleet data (`github.ts`) is
> build-time, so it refreshes on each push-triggered deploy. The *private* Ops
> View refreshes independently: a scheduled **GitHub Action** (`snapshot.yml`,
> hourly) hits `/api/cron/snapshot`, which writes GitHub snapshots to Supabase —
> **not** Vercel Cron, which needs Pro for sub-daily runs (ADR-013, #25). The
> uptime pinger (`uptime.yml`) works the same way.

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
- [ ] **`/admin` is gated** — an unauthenticated request redirects to
      `/admin/login` (fails closed).
- [ ] **Security headers present** — `curl -sSIL https://kissrobert.com` shows
      CSP `frame-ancestors 'none'`, `X-Frame-Options`, HSTS, nosniff,
      referrer- and permissions-policy (#27).

## Backups

The **public plane is stateless** — source + git history are the only state;
product data is re-fetched at each build. The **private plane** holds state in
**Supabase Postgres** (notes, marketing, uptime checks, snapshots, audit log).
Rely on Supabase's managed backups (Point-in-Time Recovery / daily backups per
plan); the ordered `supabase/migrations/` are the schema's source of truth and
recreate it from scratch.
