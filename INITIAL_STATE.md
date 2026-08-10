# INITIAL_STATE.md — Fit Beyond Interest current map

This documents the project as it exists now. The original Claude Design handoff is still
visible in some backup files, but the live flow has since been wired as a static marketing
export plus a root-level quiz app.

---

## 1. Current file structure

Top level (project root):

```
start.html                     # context/start flow entry (name → college → major → confirm)
index.html                     # gated research alias; checks preLandingComplete first
research.html                  # canonical personalized research page
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
landing/                       # current static Framer marketing export, rebranded for FBI
uploads/                       # older/separate Framer → Vercel export (.mjs, _redirects, vercel.json)
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
- **Legacy/gated alias:** `index.html`
- **Logic:** `app/research.jsx` — exports `ResearchCenter` and `DataStatusBadge`. Each HTML
  shell defines a small inline `ResearchPage()` that reads the saved college/major and
  renders `<ResearchCenter college={…} major={…} />`, falling back to a demo pairing
  (Swarthmore College / Political Science) labeled **Preview** when no context is saved.
- **Data:** `app/research-data.js`, `researchSources.json`, `collegeProfiles.json`,
  `collegeMajors.json`, `nearbyColleges.json`, and `colleges.json`

Important difference: `index.html` runs a pre-landing gate before rendering research; if
`UserContext.load().preLandingComplete` is false it redirects to `start.html`. `research.html`
does not gate; direct opens render the visible Preview demo state.

## 4. Which file controls the landing page

- **Current marketing landing:** `landing/index.html` and nested pages under `landing/`
  (static Framer export). The quiz CTA should enter the root quiz at `start.html` with the
  correct relative path for the page depth.
- **Marketing backups:** `Landing (marketing backup).html`, `Landing (original).html`, and
  the older `uploads/` export. Treat them as separate artifacts; edits to `landing/` or
  `app/` do not propagate across these files.
- Root `index.html` is **not** the public marketing homepage in the current source. It is a
  gated research alias.

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
- **Marketing entry:** open `landing/index.html` over HTTP/HTTPS. Its quiz CTA should route
  to `start.html` and must not skip context by deep-linking to `research.html`/`survey.html`.
- **Pre-landing gate:** `index.html` and `app/fit-app.jsx` check
  `UserContext.load().preLandingComplete`. If it is false, they redirect to `start.html`.
  `research.html` intentionally renders a Preview demo when opened without context.
- **Page-to-page links:**
  - `landing/index.html` → `start.html` from the quiz CTA.
  - `start.html` (prelanding) → on finish or skip → `research.html`.
  - `research.html` → `start.html` ("Change college / major") or `survey.html`
    ("Take the survey").
  - `survey.html` controller → `index.html` on report "Start over"; internal
    `context → quiz → analyzing → report` is React state, not URLs.
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
Do not use those as the source of truth for the live light app.

## 9. What currently happens after the user enters name / college / major

In `app/prelanding.jsx`, on finishing the context flow it:

1. Calls `UserContext.update({ preLandingComplete: true, contextConfirmed: true })`.
2. Runs `window.location.href = "research.html"`.

The skip action also marks `preLandingComplete: true` and routes to `research.html`, even
though some button copy still says "Skip intro" / "Skip to landing". The behavior is a route
to the research page, not to the Framer marketing site.

`app/fit-app.jsx` independently enforces the survey gate: on mount, if there's no
`UserContext` or `!preLandingComplete`, it `window.location.replace("start.html")`.

---

## 10. Risky or confusing areas in the current project

1. **`index.html` vs `research.html` can still drift.** `research.html` is canonical, but
   `index.html` renders a similar research shell after the gate. If the research chrome or CTA
   changes, update both or remove the alias intentionally.

2. **"Homepage" is ambiguous unless named precisely.** The public marketing homepage is
   `landing/index.html`. Root `index.html` is a gated research alias. Do not use "home",
   "landing", and "research" interchangeably in code reviews or docs.

3. **No distinct survey-intro step.** The intended flow has a "what the survey measures /
   why it matters" screen (README §3 step 5). Today the survey jumps from research →
   `survey.html`, whose controller starts at the `context` phase. The intro screen doesn't
   exist as its own step yet.

4. **Post-context and reset routes live in different places.** `app/prelanding.jsx` sends
   confirmed/skipped users to `research.html`; `app/fit-app.jsx` sends report "Start over"
   to `index.html`. Any route change must account for both.

5. **Multiple parallel artifacts.** The live light app (`app/`), a dark variant
   (`app-dark/`), the current `landing/` Framer export, and the older `uploads/` export are
   separate. Edits to one do **not** propagate to the others.

6. **CDN + Babel-in-browser.** No build step or dependency lockfile; React/Babel are pinned
   via SRI on `unpkg`. Offline or CDN outages break the app, and in-browser Babel compile
   is slow/dev-only — fine for a prototype, not for production.

7. **Design-preview sandbox vs. real behavior.** External links and full page navigation
   misbehave inside the Claude/Design preview (`X-Frame-Options: DENY`). Don't diagnose
   routing/link bugs from the preview — test locally or on a deployed site.

8. **Demo/fallback data.** The research page falls back to Swarthmore / Political Science
   when no context is saved. It is labeled **Preview**, but any change must preserve that
   honesty labeling (README §6).
