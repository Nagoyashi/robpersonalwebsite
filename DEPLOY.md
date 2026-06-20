# DEPLOY.md — deploy runbook

**Target:** GitHub Pages, published by a **GitHub Actions build** (the site is
now an Astro app — Pages cannot build it from a branch). See
[DECISIONS.md](DECISIONS.md) ADR-005/008.

## One-time setup (owner only)

1. **Switch Pages to Actions:** Repo → **Settings → Pages → Build and
   deployment → Source: "GitHub Actions"**. (Not "Deploy from a branch".)
2. **Custom domain:** `public/CNAME` contains `kissrobert.com`. Point DNS at
   GitHub Pages (`A`/`AAAA` to the Pages IPs, or a `CNAME` to
   `nagoyashi.github.io`), then it appears under Settings → Pages.
   - ⚠️ Until DNS resolves, browse the `*.github.io` URL. If you need the
     project subpath to work before the domain is live, set
     `base: '/robpersonalwebsite'` in `astro.config.mjs`.
3. **(Optional) Live data for PRIVATE repos** — install the read-only GitHub App
   and add its secrets (ADR-007). Without this, private repos (SabeValor,
   Pandavo) render `products.ts` fallbacks; public repos still auto-update.
   - Create a GitHub App: permissions **Contents: read**, **Issues: read**,
     **Metadata: read**; install on the `Nagoyashi` account.
   - Add repo **Actions secrets**: `FLEET_APP_ID`, `FLEET_APP_PRIVATE_KEY`
     (the full `.pem`). The build mints a short-lived token from these; it is
     never bundled to the client.

## Deploy procedure (per release)

1. Merge all changes (including `docs/releases/vX.Y.Z.md`) to `main` via PR.
2. The push to `main` triggers **`deploy.yml`** → build → publish to Pages.
   (A **daily cron** also rebuilds to refresh GitHub-sourced fleet data.)
3. Verify (below).
4. Only after verification, push the annotated tag `vX.Y.Z` ("ship it") —
   `release.yml` then publishes the GitHub Release and closes the milestone.

## Local build / preview

```
npm install        # once
npm run dev        # http://localhost:4321 (hot reload)
npm run build      # static output -> dist/
npm run preview    # serve the built dist/
npm run check      # astro type-check
```
Locally, without the App secret, private-repo data falls back to `products.ts`;
public repos fetch unauthenticated.

## Per-deploy verification checklist

- [ ] `deploy.yml` run is green (Actions tab); Pages deployment succeeded.
- [ ] Live URL loads the homepage with styling (no unstyled page).
- [ ] Fleet shows correct versions/status; `/now`, `/uses`, `/log` all load.
- [ ] Nav links resolve (no 404s); external links open correctly.
- [ ] Looks correct on mobile width.

## Backups

Not applicable — the site is **stateless**. Source + git history are the only
state; product data is re-fetched at each build.
