# CLAUDE.md — operating manual for this repo

`robpersonalwebsite` — Robert Kiss's solo software-studio homepage. An
**Astro** static site (see [DECISIONS.md](DECISIONS.md) ADR-005) with a
build-time GitHub data layer. Output is static HTML; no test suite.

## Hard invariants / RULES (non-negotiable)

- **Stack / dependency contract.** Astro, building to static HTML. **Zero
  client JS by default** — add an interactive island only when genuinely needed.
  Keep dependencies lean; a new framework/major dependency needs a written entry
  in [DECISIONS.md](DECISIONS.md). Styling stays in the single
  `src/styles/global.css` unless an ADR says otherwise.
- **No client-side data fetching.** All external/GitHub data is fetched at
  **build time** only, in `src/lib/github.ts`. The browser never calls GitHub.
- **Single source of truth for the fleet.** Product facts live only in
  `src/config/products.ts`; `github.ts` enriches and must always fall back to
  it so the build never breaks. **No invented metrics, counts, or claims** —
  unknowns render as marked placeholders, never fabricated.
- **No secrets in the client bundle, ever.** Tokens (the read-only GitHub App
  installation token) are build-only, read as a non-`PUBLIC_` env var. No
  `.env` / keys / tokens are committed. App ID + key live only as CI secrets.
- **CI gate.** The `validate` check (`.github/workflows/ci.yml`) must pass
  before any PR merges to `main`. It runs `astro check` + `astro build` (a green
  build is the structural guarantee). Do not merge red. [CONFIRM once branch
  protection is enabled — see Release ritual]
- **No direct commits to `main`.** All changes land via short-lived branch → PR.
- **Performance budget.** Stay lightweight: static output, zero JS by default,
  no heavy assets. Adding large media or third-party scripts needs a
  DECISIONS.md entry.

## This repo's Project board

- **Board #7 — "kissrobert.com"** (owner `Nagoyashi`)
- URL: https://github.com/users/Nagoyashi/projects/7
- ID: `PVT_kwHOCMnp4s4Ban5Z`
- Per-task status (Todo / In progress / Done) lives **on this board**, not in
  any hand-written doc. New issues are added to it (auto-add toggle in the
  board's settings UI, scoped to this repo).

## Session protocol

When asked to "continue" or "read status", reconstruct live state from GitHub —
do not trust hand-written status prose:
1. The open **milestone** and its issues.
2. Open **PRs**.
3. The latest comment on the in-progress issue.
4. Item states on **board #7**.

Live GitHub state is the source of truth.

## Release-cycle state machine

| State | Meaning | Advances when |
|---|---|---|
| planning | milestone open, issues triaged | issues assigned to the milestone + added to board #7 |
| in progress | branches/PRs being merged under CI | all milestone issues closed |
| notes written | `docs/releases/vX.Y.Z.md` merged to `main` | notes PR merged |
| deployed | `main` is live on GitHub Pages | Pages serves the new commit (see [DEPLOY.md](DEPLOY.md)) |
| tagged | annotated `vX.Y.Z` pushed onto the deployed commit | you push the tag ("ship it") |
| released | GitHub Release published + milestone closed | `release.yml` runs on the tag |

## Milestone-as-cycle

- **One open milestone at a time**, named for the version it ships (e.g.
  `v0.2.0`).
- Every issue worked this cycle is created/assigned with
  `gh issue ... --milestone "vX.Y.0"` and added to board #7.

## Release ritual (main-only flow)

1. Work issues on `feature/*` branches → PR → CI (`validate`) green → merge to
   `main`. One logical change per commit.
2. When the milestone's issues are done, write `docs/releases/vX.Y.Z.md`
   (H1 = release title, body = notes) and merge it to `main` **first**.
3. **Deploy:** `main` auto-publishes to GitHub Pages on push (see DEPLOY.md);
   verify the live site. [ASK ME before treating a deploy as shipped]
4. **[ASK ME]** Push the annotated tag onto the deployed commit:
   `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`. This is the only
   manual release trigger.
5. `release.yml` publishes the GitHub Release from the notes file and closes the
   `vX.Y.Z` milestone. Do not publish Releases by hand.

## Working conventions

- One logical change per commit.
- Branch naming: `feature/*`, `fix/*`, `chore/*`; merge via PR (squash or
  merge-commit — keep consistent). [CONFIRM]
- **[ASK ME] gates** at consequential steps: merges, branch protection changes,
  milestone creation, and tagging. Create/merge nothing without explicit OK.

## Automation boundary

CI, Dependabot, and Release-publishing are automated. **Deploy is separate** —
it is GitHub Pages serving `main` (auto-on-push once Pages is enabled);
`release.yml` never deploys. "Tag → publish Release" and "deploy" are two
different actions.

## Project docs

See [README.md](README.md#project-docs) for the full doc index.
