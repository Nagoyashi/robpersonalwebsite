# &lt;RobertKiss /&gt; — solo software studio

> **// all systems online**

The personal site of **Robert Kiss** — a one-person software studio. I design,
build, and run software products end to end. The homepage features a **live
fleet** of those products: status, version, and last-shipped pulled from GitHub
**at build time** (never from the browser, never with a client-side token).

**Stack:** [Astro](https://astro.build) (static output, zero JS by default).
Content pages are Markdown. See [DECISIONS.md](DECISIONS.md) for the why.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview    # serve the build
npm run check      # type-check
```

## How the fleet works

- [`src/config/products.ts`](src/config/products.ts) — the **single source of
  truth**. Hand-maintained: name, status, version, links. Cards link to the
  deployed site; a repo link shows only where the repo is public.
- [`src/lib/github.ts`](src/lib/github.ts) — **build-time-only** enrichment.
  Pulls live versions, releases, and open milestones for any repo it can read;
  falls back to `products.ts` on any failure, so the fleet always renders.
- Private-repo data needs the read-only GitHub App (see
  [DEPLOY.md](DEPLOY.md)); without it, private repos show their fallbacks.

**Two hard rules:** no invented metrics or claims anywhere; no secrets in the
client bundle, ever.

## Project docs

| Doc | Purpose |
| :--- | :--- |
| [CLAUDE.md](CLAUDE.md) | Agent operating manual + hard invariants / RULES |
| [project.md](project.md) | Roadmap & phase-level status |
| [DECISIONS.md](DECISIONS.md) | Architecture decision log |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | File map & code-placement conventions |
| [DEPLOY.md](DEPLOY.md) | Deploy runbook (GitHub Pages via Actions) |
| [docs/releases/](docs/releases/) | Per-release notes (source of GitHub Releases) |

---
*© 2026 Robert Kiss*
