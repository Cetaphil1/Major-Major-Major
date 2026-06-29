# INITIAL_STATE.md — Fit Beyond Interest current source map

This documents the project **as it currently is** so future changes start from verified
source behavior rather than stale handoff assumptions. Keep it in sync with `README.md` and
`TECHNICAL_SPEC.md` when routing, storage, or file ownership changes.

---

## 1. Current file structure

Top level (project root):

```
start.html                     # context/start flow entry (name → college → major → confirm)
index.html                     # guarded research-center entry for returning/legacy links
research.html                  # canonical post-context research page
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
landing/                       # generated Framer marketing export (separate artifact)
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
- **Legacy/returning entry:** `index.html` also renders `ResearchCenter`, but first checks
  `UserContext.load().preLandingComplete` and redirects to `start.html` when the context flow
  has not been completed.
- **Logic:** `app/research.jsx` — exports `ResearchCenter` and `DataStatusBadge`. Each HTML
  shell defines a small inline `ResearchPage()` that reads the saved college/major and
  renders `<ResearchCenter college={…} major={…} />`, falling back to a demo pairing
  (Swarthmore College / Political Science) labeled **Preview** when no context is saved.
- **Data:** `app/research-data.js` (links + status labels), `researchSources.json`

## 4. Which file controls the landing page

- **Generated marketing export:** `landing/` (Framer-generated static files). Treat this as a
  separate artifact from the root quiz app; changes in `app/` do not update it.
- **Marketing landing (backup):** `Landing (marketing backup).html` (uses `landing.css`,
  `animations.jsx`)
- **Older marketing landing:** `Landing (original).html`
- The root `index.html` is **not** a generic homepage today. It is a guarded research-center
  entry. This is a likely source of confusion because milestone docs describe a future public
  root redirect that is not implemented in the current source.

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
- **Pre-landing gate:** `index.html` and `app/fit-app.jsx` check
  `UserContext.load().preLandingComplete`. If it is false, they
  `window.location.replace('start.html')` to force the context flow first.
- **Page-to-page links:**
  - `start.html` (prelanding) → on finish/skip → **`research.html`** (see §9).
  - `research.html` → `start.html` ("Change college / major"),
    `survey.html` ("Take the survey →").
  - `index.html` → `start.html` when the pre-landing gate fails; otherwise it renders a
    research-center variant with links to `start.html` and `survey.html`.
  - `survey.html` controller → `index.html` (back to guarded research) on back/restart;
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
  on top of this as the source of truth for name/college/major.

Other files also touch storage in scraps/variants: `app-dark/fit-app.jsx`,
`dimensions.html`, `models.html`, `model-iceberg.html`, `iceberg.jsx`, `animations.jsx`.

## 9. What currently happens after the user enters name / college / major

In `app/prelanding.jsx` (lines ~395–402), on finishing the context flow it:

1. Calls `UserContext.update({ preLandingComplete: true, contextConfirmed: true })`.
2. Runs `window.location.href = "research.html"`.

So today the user lands directly on **`research.html`**, the canonical personalized
school/major research page. `index.html` still renders a research-center variant for
returning/legacy links after the pre-landing gate passes, so shell markup can drift if only
one research entry is edited.

`app/fit-app.jsx` independently enforces the gate: on mount, if there's no `UserContext` or
`!preLandingComplete`, it `window.location.replace("start.html")`.

---

## 10. Risky or confusing areas in the current project

1. **`index.html` vs `research.html` can drift.** `research.html` is the canonical
   post-context page, while `index.html` is a guarded research-center variant. They share
   `ResearchCenter` but differ in gate, greeting, and CTA shell markup. Changing one shell
   and not the other can create inconsistent behavior.

2. **"Homepage" is ambiguous.** `landing/` contains a generated marketing export, while root
   `index.html` is still a guarded research entry. The milestone goal of making the site
   root a landing redirect is not current source behavior.

3. **No distinct survey-intro step.** The intended flow has a "what the survey measures /
   why it matters" screen (README §3 step 5). Today the survey jumps from research →
   `survey.html`, whose controller starts at the `context` phase. The intro screen doesn't
   exist as its own step yet.

4. **Post-context and back/restart routes are hard-coded in different places.**
   `app/prelanding.jsx` routes to `research.html`, while `app/fit-app.jsx` sends survey
   back/restart actions to `index.html`. Any route change must update both intentionally.

5. **Parallel codebases/artifacts.** The live light app (`app/`), a dark variant
   (`app-dark/`), the generated `landing/` export, and the older Framer/Vercel marketing
   build (`uploads/`) do not automatically share changes.

6. **CDN + Babel-in-browser.** No build step or dependency lockfile; React/Babel are pinned
   via SRI on `unpkg`. Offline or CDN outages break the app, and in-browser Babel compile
   is slow/dev-only — fine for a prototype, not for production.

7. **Design-preview sandbox vs. real behavior.** External links and full page navigation
   misbehave inside the Claude/Design preview (`X-Frame-Options: DENY`). Don't diagnose
   routing/link bugs from the preview — test locally or on a deployed site.

8. **Demo/fallback data.** `research.html` falls back to Swarthmore / Political Science when
   no context is saved. It is labeled **Preview**, but any change must preserve that honesty
   labeling (README §6). `index.html` usually prevents this path for first-time visitors by
   redirecting them to `start.html`.
