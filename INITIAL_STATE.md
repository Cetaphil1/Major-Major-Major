# INITIAL_STATE.md — Fit Beyond Interest current state

This documents the project **as it currently is** so future changes can start from the
actual route map and file ownership. The app still carries handoff-era design scraps and
duplicates, but the live path has evolved from the original bundle.

---

## 1. Current file structure

Top level (project root):

```
index.html                     # gated research-center alias; first-time visitors → start.html
start.html                     # context/start flow entry (name → college → major → confirm)
research.html                  # canonical post-context research center
survey.html                    # survey + analyzing + report controller (loads fit-app.jsx)
about.html                     # about/explainer page
Landing (marketing backup).html  # marketing landing (backup)
Landing (original).html          # older marketing landing
Start flow (editable).html     # editable, self-contained version of the start flow
Survey (dark).html             # dark-variant survey entry
dimensions.html, models.html, model-iceberg.html, Elemental Text.html  # design/explainer scraps

# Stylesheets (root)
tokens.css, light.css, skolla.css, landing.css

# Standalone JSX scraps (root)
animations.jsx, iceberg.jsx, tweaks-panel.jsx

# Data (root, JSON)
colleges.json, majors.json, collegeMajors.json, collegeProfiles.json,
nearbyColleges.json, researchSources.json

app/                           # ← the real shared app source (light theme)
  user-context.js              # localStorage identity store (window.UserContext)
  research-data.js             # research links + data-honesty status labels
  college-snapshots.js         # college snapshot dataset
  data.jsx                     # survey SECTIONS / DIMENSIONS / majors data
  primitives.jsx               # shared UI primitives
  prelanding.jsx               # the start/context flow (name, college, major, confirm)
  screens-context.jsx          # context screens used by survey controller
  screens-quiz.jsx             # survey/quiz screens
  screens-report.jsx           # report/results screens
  research.jsx                 # ResearchCenter component + DataStatusBadge
  fit-app.jsx                  # survey→analyzing→report flow controller + scoring
  flow.css, prelanding.css, report.css, research.css, kit.css, colors_and_type.css

app-dark/                      # parallel DARK variant of the app (data/fit-app/screens/kit/...)
uploads/                       # separate Framer → Vercel marketing build (.mjs, _redirects, vercel.json)
assets/                        # mark.svg, logos
screenshots/                   # design reference PNGs (not used at runtime)
```

> Note: `start.html` (the handoff entry the user had open) imports
> `app/flow.css`, `app/prelanding.css`, `app/user-context.js`,
> `app/college-snapshots.js`, `app/data.jsx`, `app/screens-context.jsx`,
> `app/prelanding.jsx`. `Start flow (editable).html` is a flattened, self-contained
> mirror of the same four-screen flow (Name → College → Major → Preview report) with its
> CSS/JS inlined.

---

## 2. Which file controls the start / context flow

- **Entry:** `start.html`
- **Logic:** `app/prelanding.jsx` (the four-step flow: name → college → major → confirm/preview)
- **Supporting:** `app/screens-context.jsx`, `app/data.jsx`, `app/college-snapshots.js`,
  `app/user-context.js`
- **Self-contained editable mirror:** `Start flow (editable).html` (same screens, inlined —
  useful as a static reference, not wired to the shared `app/` modules)

## 3. Which file controls the research page

- **Canonical entry:** `research.html`
- **Alias:** `index.html` renders the same `ResearchCenter` after a pre-landing gate. If
  `UserContext.load().preLandingComplete` is false, it redirects to `start.html`.
- **Logic:** `app/research.jsx` — exports `ResearchCenter`, `DataStatusBadge`, and the
  reusable research sections. Each HTML shell defines a small inline `ResearchPage()` that
  reads the saved college/major and renders
  `<ResearchCenter college={…} major={…} />`.
- **No-context behavior:** `research.html` falls back to a demo pairing (Swarthmore College /
  Political Science) labeled **Preview** when no context is saved. `index.html` gates
  first-time visitors back to `start.html`.
- **Data:** `app/research-data.js` (link builders, live Scorecard lookup, status labels),
  `researchSources.json`, `collegeProfiles.json`, `collegeMajors.json`,
  `nearbyColleges.json`, `colleges.json`.

## 4. Which file controls the landing page

- **Public marketing landing:** `landing/index.html` (CTA links to `../start.html`).
- **Marketing landing backups:** `Landing (marketing backup).html` (uses `landing.css`,
  `animations.jsx`) and `Landing (original).html`.
- Root `index.html` is **not** the marketing homepage today; it is a gated research-center
  alias. This is the main naming trap in the repo.

## 5. Which file controls the survey

- **Entry:** `survey.html`
- **Logic:** `app/screens-quiz.jsx` (quiz screens) driven by `app/fit-app.jsx` (the overall
  flow controller). Survey questions/dimensions come from `app/data.jsx`.
- **Dark variant:** `Survey (dark).html` + `app-dark/`.

## 6. Which file controls the report / results

- **Controller + scoring:** `app/fit-app.jsx` — computes dimension scores, overall fit,
  switch risk, burnout risk, and builds the narrative report object.
- **Report UI:** `app/screens-report.jsx`
- Both are loaded by `survey.html`. The report is the final `phase` of the `fit-app.jsx`
  state machine (`context → quiz → analyzing → report`), not a separate HTML page.

---

## 7. How routing currently works

- **Plain multi-page app.** Each screen is its own `.html` file. Navigation is done with
  plain anchors and `window.location.href` / `window.location.replace` — **no React Router,
  no bundler, no hash routing.**
- React + ReactDOM + Babel Standalone load from `unpkg` CDNs; `.jsx` is compiled in the
  browser via `<script type="text/babel">`.
- **Pre-landing gates:** `index.html` and `app/fit-app.jsx` check
  `UserContext.load().preLandingComplete`. If it is false, they redirect to
  `start.html` to force the context flow first.
- **Page-to-page links:**
  - `landing/index.html` → `../start.html` ("Take the quiz").
  - `start.html` (prelanding) → on finish → **`research.html`** (see §9).
  - `research.html` → `start.html` ("Change college / major"), `survey.html`
    ("Take the survey →").
  - `index.html` → `start.html`, `survey.html` after the gate passes.
  - `survey.html` controller → `index.html` (back to landing/research) on restart;
    internal `context → quiz → analyzing → report` is React state, not URLs.
- **External links** are plain `<a target="_blank" rel="noopener noreferrer">`, with an
  optional delegated `window.open` fallback. They are intentionally **not** routed through
  any internal mechanism.

## 8. Where localStorage / sessionStorage is used

Two separate `localStorage` keys (no `sessionStorage`):

- **`fbi-user-context-v1`** — managed by `app/user-context.js` (`window.UserContext`).
  Single source of truth for identity. Shape:
  ```
  {
    displayName: string | null,
    selectedCollege: { name, city, state, type, level, id, isManual } | null,
    selectedMajor:   { name, category, cipCode, keywords[], relatedMajors[], isManual } | null,
    contextConfirmed: boolean,
    preLandingComplete: boolean
  }
  ```
  Read/written by `start.html`/prelanding, `index.html`, `research.html`, `survey.html`.

- **`fbi-flow-v1`** — managed by `app/fit-app.jsx`. Survey/report progress:
  `{ phase, ctx, sectionIdx, answers }`. `fit-app.jsx` overlays the `UserContext` identity
  on top of this as the source of truth for name/college/major. The report object is
  recomputed from this state; it is not stored.

- **`fbi-sc-<normalized-college-name>`** — managed by `app/research-data.js`. Successful live
  College Scorecard matches are cached for about 30 days. Rate-limit/no-match failures are
  not cached.

Other files also touch storage in scraps/variants: `app-dark/fit-app.jsx`,
`dimensions.html`, `models.html`, `model-iceberg.html`, `iceberg.jsx`, `animations.jsx`.

## 9. What currently happens after the user enters name / college / major

In `app/prelanding.jsx`, on finishing the context flow it:

1. Calls `UserContext.update({ preLandingComplete: true, contextConfirmed: true })`.
2. Runs `window.location.href = "research.html"`.

The skip path also marks `preLandingComplete: true` and routes to `research.html`, leaving
any partial context honestly represented by the research page's demo/fallback states.

`app/fit-app.jsx` independently enforces the survey gate: on mount, if there's no
`UserContext` or `!preLandingComplete`, it `window.location.replace("start.html")`.
Its context back/restart helper still routes to `index.html`, so update that controller if
`research.html` becomes the only allowed research entry.

---

## 10. Risky or confusing areas in the current project

1. **`index.html` vs `research.html` still overlap.** `research.html` is canonical, but
   `index.html` still renders the same `ResearchCenter` after a gate. Changing inline page
   chrome in one without the other can cause drift.

2. **"Homepage" is ambiguous.** The public marketing homepage is `landing/index.html`, while
   root `index.html` is a gated research alias. Be explicit about which one a route or task
   means.

3. **No distinct survey-intro step.** The intended flow has a "what the survey measures /
   why it matters" screen (README §3 step 5). Today the survey jumps from research →
   `survey.html`, whose controller starts at the `context` phase. The intro screen doesn't
   exist as its own step yet.

4. **Route owners are split.** `app/prelanding.jsx` sends completed context to
   `research.html`; `app/fit-app.jsx` still sends survey back/restart to `index.html`; root
   `index.html` owns its own gate. Any routing cleanup must update all affected owners and
   docs together.

5. **Three parallel codebases.** The live light app (`app/`), a dark variant (`app-dark/`),
   and a separate Framer/Vercel marketing build (`uploads/`). Edits to `app/` do **not**
   propagate to the others. It's unclear which is the deploy target.

6. **CDN + Babel-in-browser.** No build step or dependency lockfile; React/Babel are pinned
   via SRI on `unpkg`. Offline or CDN outages break the app, and in-browser Babel compile
   is slow/dev-only — fine for a prototype, not for production.

7. **Design-preview sandbox vs. real behavior.** External links and full page navigation
   misbehave inside the Claude/Design preview (`X-Frame-Options: DENY`). Don't diagnose
   routing/link bugs from the preview — test locally or on a deployed site.

8. **Demo/fallback data.** The research page falls back to Swarthmore / Political Science
   when no context is saved. It is labeled **Preview**, but any change must preserve that
   honesty labeling (README §6).
