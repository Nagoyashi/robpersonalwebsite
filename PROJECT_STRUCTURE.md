# PROJECT_STRUCTURE.md — file map & code placement

**Single-document-ownership rule:** each fact lives in exactly one doc. Don't
duplicate content across files — link instead.

The site is an **Astro** project (see [DECISIONS.md](DECISIONS.md) ADR-005).
Output is static HTML in `dist/`, published to GitHub Pages by a build workflow.

## Top-level tree

```
robpersonalwebsite/
├── astro.config.mjs        # Astro config (site URL, sitemap, build format).
├── package.json            # Scripts (dev/build/preview/check) + deps.
├── tsconfig.json           # Strict TS config (extends astro/tsconfigs/strict).
├── src/
│   ├── config/
│   │   └── products.ts     # SINGLE SOURCE OF TRUTH for the fleet (hand-maintained).
│   ├── lib/
│   │   ├── github.ts       # Build-time-only GitHub fetchers (enrichment + fallback).
│   │   └── format.ts       # Date / status-label helpers.
│   ├── content.config.ts   # Content collection schema (the `pages` collection).
│   ├── content/
│   │   ├── now.md          # /now source (+ homepage Now-strip headline).
│   │   └── uses.md         # /uses source.
│   ├── layouts/
│   │   └── Base.astro      # HTML shell: head/SEO/OG, fonts, nav, footer, scripts.
│   ├── components/
│   │   ├── Nav.astro       # Sticky nav (links must resolve to real pages).
│   │   ├── Footer.astro    # Contact footer.
│   │   ├── FleetCard.astro # One product card.
│   │   └── StatusPill.astro# Status/kind pill.
│   ├── pages/
│   │   ├── index.astro     # Homepage (hero, fleet, now, log, about, contact).
│   │   ├── now.astro       # Renders content/now.md.
│   │   ├── uses.astro      # Renders content/uses.md.
│   │   └── log.astro       # Full release log (build-time GitHub data).
│   └── styles/
│       └── global.css      # All styling (the single stylesheet).
├── public/                 # Copied verbatim to the site root.
│   ├── favicon.svg
│   ├── robots.txt
│   ├── CNAME               # Custom domain (kissrobert.com).
│   └── og.png              # [FILL IN] 1200x630 share image.
├── docs/
│   └── releases/
│       ├── README.md       # Release-notes convention.
│       └── vX.Y.Z.md       # One file per release (source of Release notes).
└── .github/
    ├── workflows/
    │   ├── ci.yml          # `validate` — astro check + build (no secret).
    │   ├── deploy.yml      # Build + publish to Pages (push, daily cron, dispatch).
    │   └── release.yml     # Tag-triggered Release publisher + milestone closer.
    └── dependabot.yml      # Weekly updates (github-actions + npm).
```

## Where new code/content belongs

- **Fleet/product data** → `src/config/products.ts` (the only place). Never
  hardcode product facts in a component or page.
- **Anything that talks to GitHub** → `src/lib/github.ts`, build-time only.
  Never fetch GitHub from the browser; never read a token outside this module.
- **Page markup / sections** → `src/pages/*.astro` (compose) and
  `src/components/*.astro` (reusable pieces).
- **Long-form content** (now, uses, future /about) → Markdown in `src/content/`
  with an entry in the `pages` collection.
- **Styling** → `src/styles/global.css` (keep it the single stylesheet unless a
  DECISIONS.md entry says otherwise).
- **Static assets** (images, fonts, og image) → `public/` (served from root).
- **Release notes** → `docs/releases/vX.Y.Z.md` (never elsewhere).
- **New automation** → `.github/workflows/`. New dependency ecosystems → a new
  block in `.github/dependabot.yml`.
