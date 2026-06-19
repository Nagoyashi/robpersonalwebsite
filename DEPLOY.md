# DEPLOY.md — deploy runbook

**Target:** GitHub Pages, serving the `main` branch root. The site is static
(`index.html` + `style.css`), so there is **no build step** — Pages serves the
files directly.

## Status

⚠️ **GitHub Pages is not yet enabled.** Enabling it is a one-time manual step
(only the repo owner can do it):

1. Repo → **Settings → Pages**.
2. **Build and deployment → Source:** "Deploy from a branch".
3. **Branch:** `main`, **folder:** `/ (root)` → **Save**.
4. Wait ~1 minute; the published URL appears at the top of the Pages settings
   (typically `https://nagoyashi.github.io/robpersonalwebsite/`).

Once enabled, deploy is **automatic on every push to `main`** — there is no
separate deploy command.

## Deploy procedure (per release)

1. Merge all changes (including `docs/releases/vX.Y.Z.md`) to `main` via PR.
2. The push to `main` triggers the Pages rebuild automatically.
3. Verify (below).
4. Only after verification, push the annotated tag `vX.Y.Z` ("ship it").

## Per-deploy verification checklist

- [ ] Pages build shows green (Settings → Pages, or the "github-pages"
      deployment in the repo's Environments/Deployments).
- [ ] Live URL loads `index.html` and applies `style.css` (no unstyled page).
- [ ] Internal links/anchors work; external links open correctly.
- [ ] Looks correct on mobile width.

## Backups

Not applicable — the site is **stateless**. There is no database or user data;
the git history is the only state, and GitHub holds it.

## Custom domain (future) [CONFIRM]

The board is named "kissrobert.com". To use it later: add a `CNAME` file (or set
the custom domain in Settings → Pages) and point DNS at GitHub Pages. Record the
decision in [DECISIONS.md](DECISIONS.md) when done.
