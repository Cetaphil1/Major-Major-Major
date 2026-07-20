# INITIAL_STATE.md — Fit Beyond Interest (current map)

This documents the project **as it currently runs**: a static Framer marketing export under
`landing/` plus a no-build React/Babel quiz app in the repo-root `.html` files. It is meant as
the quick orientation map for future coding agents before changing routes, storage, or page
ownership.

---

## 1. Current file structure

Top level (project root):

```
start.html                     # context/start flow entry (name → college → major → confirm)
index.html                     # legacy/gated research-center alias; incomplete users -> start.html
research.html                  # canonical personalized research page after start.html
survey.html                    # survey + analyzing + report controller (loads fit-app.jsx)
about.html                     # about/explainer page
landing/                       # current Framer static marketing export; "Take the quiz" -> ../start.html
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
uploads/                       # older separate Framer → Vercel export with hosting notes
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
- **Legacy alias:** `index.html`
- **Logic:** `app/research.jsx` — exports `ResearchCenter` and `DataStatusBadge`. Each HTML
  shell defines a small inline `ResearchPage()` that reads the saved college/major and
  renders `<ResearchCenter college={…} major={…} />`, falling back to a demo pairing
  (Swarthmore College / Political Science) labeled **Preview** when no context is saved.
- **Data:** `app/research-data.js` (links + status labels), `researchSources.json`
- **Difference:** `research.html` includes a personalized greeting and an end-of-page survey
  CTA. `index.html` adds a pre-landing gate and links its brand back to `index.html`.

## 4. Which file controls the landing page

- **Current marketing site:** `landing/index.html` and nested static Framer route folders.
  CTAs link into the quiz via `../start.html`; marketing pages should not deep-link to
  `research.html` or `survey.html`.
- **Marketing landing (backup):** `Landing (marketing backup).html` (uses `landing.css`,
  `animations.jsx`)
- **Older marketing landing:** `Landing (original).html`
- There is currently **no root marketing homepage.** `index.html` is still a research-center
  alias, not a redirect to `landing/index.html`. (This is a likely source of confusion — see
  §10.)

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
- **Pre-landing gate:** `index.html` (and `app/fit-app.jsx`) check
  `UserContext.load().preLandingComplete`. If it is false, they
  `window.location.replace('start.html')` to force the context flow first.
- **Page-to-page links:**
  - `landing/index.html` → "Take the quiz" → **`../start.html`**.
  - `start.html` (prelanding) → on finish → **`research.html`** (see §9).
  - `index.html` / `research.html` → `start.html` ("Change college / major"),
    `survey.html` ("Take the survey →").
  - `survey.html` controller → `index.html` (legacy research alias) on report restart;
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

In `app/prelanding.jsx`, on finishing the context flow it:

1. Calls `UserContext.update({ preLandingComplete: true, contextConfirmed: true })`.
2. Runs `window.location.href = "research.html"`.

So today the user lands on **`research.html`**, the canonical personalized research page.
The "Skip intro" and "Continue to your research" paths both mark `preLandingComplete` and
route to `research.html`. The `Start flow (editable).html` mirror may still contain older
copy/links and should be treated as a static reference, not the live controller.

`app/fit-app.jsx` independently enforces the gate: on mount, if there's no `UserContext` or
`!preLandingComplete`, it `window.location.replace("start.html")`.

---

## 10. Risky or confusing areas in the current project

1. **`index.html` vs `research.html` still overlap.** `research.html` is canonical for the
   post-context flow, but `index.html` still renders `ResearchCenter` with a gate. Changing
   shared research behavior in one shell and not the other can cause drift.

2. **"Homepage" is ambiguous.** The marketing homepage lives in `landing/index.html`, while
   repo-root `index.html` is a legacy research alias. If the deployment expects `/` to be
   marketing, implement and document a root redirect deliberately.

3. **No distinct survey explainer step.** Today the survey jumps from research →
   `survey.html`, whose controller starts at the `context` phase for stage/enrollment/intent.
   There is not a separate screen dedicated only to "what the survey measures / why it
   matters."

4. **Restart route still goes to `index.html`.** `app/fit-app.jsx` report restart clears
   `fbi-flow-v1`, preserves `fbi-user-context-v1`, and navigates to `index.html`. If product
   wants a full restart to `start.html` or marketing, update code and docs together.

5. **Parallel artifacts.** The live light quiz app (`app/`), a dark variant (`app-dark/`),
   current Framer marketing export (`landing/`), and older Framer/Vercel export (`uploads/`)
   do not share code. Edits to one do **not** propagate to the others.

6. **CDN + Babel-in-browser.** No build step or dependency lockfile; React/Babel are pinned
   via SRI on `unpkg`. Offline or CDN outages break the app, and in-browser Babel compile
   is slow/dev-only — fine for a prototype, not for production.

7. **Design-preview sandbox vs. real behavior.** External links and full page navigation
   misbehave inside the Claude/Design preview (`X-Frame-Options: DENY`). Don't diagnose
   routing/link bugs from the preview — test locally or on a deployed site.

8. **Demo/fallback data.** The research page falls back to Swarthmore / Political Science
   when no context is saved. It is labeled **Preview**, but any change must preserve that
   honesty labeling (README §6).
