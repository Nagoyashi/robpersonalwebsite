# CLAUDE.md — operating manual for this repo

`robpersonalwebsite` — Robert Kiss's personal portfolio site. A single
hand-written static page (`index.html` + `style.css`). No build step, no
dependencies, no test suite.

## Hard invariants / RULES (non-negotiable)

- **Stack / dependency contract.** This is plain static HTML5 + CSS3, served
  as-is. There is **no build step and no runtime dependency**. Do not introduce
  a framework, bundler, package manager, or `node_modules` without a written
  entry in [DECISIONS.md](DECISIONS.md) explaining why. Keep it openable by
  double-clicking `index.html`. [CONFIRM]
- **CI gate.** The `validate` check (`.github/workflows/ci.yml`) must pass
  before any PR merges to `main`. It validates HTML structure and that every
  local asset/link reference resolves. Do not merge red. [CONFIRM once branch
  protection is enabled — see Release ritual]
- **Security posture.** Public repo; contains no secrets and must stay that way.
  No `.env` / API keys / tokens belong in this repo. External links only.
- **No direct commits to `main`.** All changes land via short-lived branch → PR.
- **Performance budget.** Page must stay lightweight (single HTML + single CSS,
  no heavy assets). Adding large media or third-party scripts needs a
  DECISIONS.md entry. [CONFIRM]

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
