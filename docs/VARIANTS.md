# App Variants And Deploy Artifacts

This repository contains three separate UI artifacts. They share product
language, but they do not share a build pipeline or automatic synchronization.

## Light Root App

The root app is the main product prototype:

```text
start.html
index.html
research.html
survey.html
app/*
*.json
```

Use this tree for the current Fit Beyond Interest flow:

```text
context entry -> research center -> survey -> report
```

Runtime traits:

- Plain static HTML pages.
- React 18, ReactDOM, and Babel Standalone loaded from CDN.
- Shared state in `localStorage`.
- Global modules such as `window.UserContext` and `window.Research`.
- No bundler, package manager, route framework, or backend.

When a task says "the app" without more context, assume this root light app is
the target.

## Dark Survey Variant

The dark survey lives in:

```text
Survey (dark).html
app-dark/*
```

It is a parallel survey artifact, not a theme toggle for the root app. The dark
tree has its own copies of survey data, primitives, quiz screens, report
screens, and controller files. It does not load the light app's
`app/user-context.js`, `app/prelanding.jsx`, `app/research.jsx`, or
`app/research-data.js`.

Constraints:

- Edits to `app/*` do not update `app-dark/*`.
- Edits to `app-dark/*` do not update the root app.
- Do not assume the pre-landing gate, research center, or Scorecard integration
  exists in the dark variant unless you verify it there.
- If a feature must exist in both variants, make two explicit changes and test
  both entry pages.

## Framer/Vercel Export

The Framer marketing export lives in:

```text
uploads/index.html
uploads/assets/*
uploads/*.mjs
uploads/vercel.json
uploads/_redirects
uploads/HOSTING.md
```

Treat `uploads/` as a generated/static marketing artifact. It does not import
the root `app/` scripts and should not be used as the source of truth for survey
or research behavior.

Use `uploads/HOSTING.md` for hosting details specific to this export.

## Design And Explainer Pages

Several root files are useful references but are not the canonical runtime flow:

| File | Role |
| --- | --- |
| `Landing (marketing backup).html` | Backup marketing page |
| `Landing (original).html` | Older marketing page |
| `Start flow (editable).html` | Self-contained mirror of the start flow |
| `about.html` | Product explainer |
| `dimensions.html` | Explainer/design page for dimensions |
| `models.html` | Explainer/design page for models |
| `model-iceberg.html` | Iceberg model explainer |
| `Elemental Text.html` | Design/content scrap |
| `animations.jsx`, `iceberg.jsx`, `tweaks-panel.jsx` | Standalone design helpers |

These pages may contain duplicated copy, separate storage keys, or inline
scripts. Verify their imports before assuming a change affects the main flow.

## Choosing Where To Edit

- Change the main student journey in `app/` and the root HTML pages.
- Change report scoring in `app/fit-app.jsx` and question content in
  `app/data.jsx`.
- Change research links/data in the root JSON files and `app/research-data.js`.
- Change dark-only survey visuals or copy in `app-dark/`.
- Change Framer marketing deployment behavior in `uploads/`.

## Documentation Links

- Routing and page gates: `docs/ROUTING.md`
- Research data and source labels: `docs/RESEARCH_DATA.md`
- Survey scoring and report generation: `docs/SCORING.md`
- Initial repo map: `INITIAL_STATE.md`
