# PROJECT_STRUCTURE.md — file map & code placement

**Single-document-ownership rule:** each fact lives in exactly one doc. Don't
duplicate content across files — link instead.

## Top-level tree

```
robpersonalwebsite/
├── index.html              # The entire site: markup + content. Entry point.
├── style.css               # All styling (the only stylesheet).
├── README.md               # Overview + "Project docs" index.
├── CLAUDE.md               # Agent operating manual + hard invariants/RULES.
├── project.md              # Roadmap & phase-level status.
├── DECISIONS.md            # Architecture decision log (ADRs).
├── PROJECT_STRUCTURE.md    # This file.
├── DEPLOY.md               # Deploy runbook (GitHub Pages).
├── docs/
│   └── releases/
│       ├── README.md       # Release-notes convention.
│       └── vX.Y.Z.md       # One file per release (source of Release notes).
└── .github/
    ├── workflows/
    │   ├── ci.yml          # `validate` — HTML structure + local-link check.
    │   └── release.yml     # Tag-triggered Release publisher + milestone closer.
    └── dependabot.yml      # Weekly github-actions updates.
```

## Where new code/content belongs

- **Page content / markup** → `index.html`.
- **Styling** → `style.css` (keep it the single stylesheet unless a
  DECISIONS.md entry says otherwise).
- **Static assets** (images, fonts, downloadable files) → a new top-level
  `assets/` directory; reference with relative paths so the CI local-link check
  covers them.
- **Release notes** → `docs/releases/vX.Y.Z.md` (never elsewhere).
- **New automation** → `.github/workflows/`. New dependency ecosystems → a new
  block in `.github/dependabot.yml`.
