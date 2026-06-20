# Release notes

One file per release: `vX.Y.Z.md`.

- The file's **H1** (`# ...`) becomes the GitHub Release **title**.
- Everything after the H1 becomes the Release **body**.
- The notes file must be written and **merged onto the integration branch
  (`main`) BEFORE** the matching tag `vX.Y.Z` is pushed. The tag-triggered
  `release.yml` workflow reads `docs/releases/<tag>.md` and will fail the
  release if the file is missing.
- A hyphen in the tag (e.g. `v0.2.0-rc.1`) marks a pre-release.

This file is the single source of truth for each release — do not duplicate
release notes elsewhere.
