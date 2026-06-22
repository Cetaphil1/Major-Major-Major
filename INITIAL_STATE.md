# INITIAL_STATE.md — Fit Beyond Interest (as found)

This documents the project **as it was originally found**, before routing or design
changes. It comes from the Claude Design handoff bundle (`College major` project) copied
into this working directory.

> Maintenance note: this is now a historical baseline, not the current live spec. Since
> this file was written, `app/prelanding.jsx` has been updated to route confirmed context
> to `research.html`, `research.html` has been personalized with a greeting and survey CTA,
> and `landing/index.html` has been rebranded as the public marketing page. `index.html`
> still contains a legacy gated research shell. Use `TECHNICAL_SPEC.md` for current
> routing and operational guidance.

---

## 1. Current file structure

Top level (project root):

```
start.html                     # context/start flow entry (name → college → major → confirm)
index.html                     # research center (loads research.jsx + inline ResearchPage)
research.html                  # DUPLICATE of index.html — same research center
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

- **Entry:** `index.html` **and** `research.html` (currently **duplicates** of each other)
- **Logic:** `app/research.jsx` — exports `ResearchCenter` and `DataStatusBadge`. Each HTML
  shell defines a small inline `ResearchPage()` that reads the saved college/major and
  renders `<ResearchCenter college={…} major={…} />`, falling back to a demo pairing
  (Swarthmore College / Political Science) labeled **Preview** when no context is saved.
- **Data:** `app/research-data.js` (links + status labels), `researchSources.json`

## 4. Which file controls the landing page

- **Marketing landing (backup):** `Landing (marketing backup).html` (uses `landing.css`,
  `animations.jsx`)
- **Older marketing landing:** `Landing (original).html`
- There is currently **no plain "generic homepage."** `index.html` is the **research
  center**, not a marketing/home page. (This is a likely source of confusion — see §10.)

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
  - `start.html` (prelanding) → on finish → **`index.html`** (see §9).
  - `index.html` / `research.html` → `start.html` ("Change college / major"),
    `survey.html` ("Take the survey →").
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
  on top of this as the source of truth for name/college/major.

Other files also touch storage in scraps/variants: `app-dark/fit-app.jsx`,
`dimensions.html`, `models.html`, `model-iceberg.html`, `iceberg.jsx`, `animations.jsx`.

## 9. What currently happens after the user enters name / college / major

In `app/prelanding.jsx` (lines ~395–401), on finishing the context flow it:

1. Calls `UserContext.update({ preLandingComplete: true, contextConfirmed: true })`.
2. Runs `window.location.href = "index.html"`.

So today the user lands on **`index.html`**. Because `index.html` currently renders the
**research center** (`ResearchCenter`), the user *does* effectively reach research — but
only because `index.html` happens to be the research page, not because of an explicit
"go to research" route. The `Start flow (editable).html` mirror's final CTA is even
labeled "Continue to **main page**" → `index.html`, reinforcing the "index = home" mental
model. This is the area most likely to drift from the intended flow (README §3 step 3).

`app/fit-app.jsx` independently enforces the gate: on mount, if there's no `UserContext` or
`!preLandingComplete`, it `window.location.replace("start.html")`.

---

## 10. Risky or confusing areas in the current project

1. **`index.html` vs `research.html` are duplicates.** Both render the same
   `ResearchCenter`. It's unclear which is canonical. Changing one and not the other will
   cause drift. A decision is needed (pick one as the research page; decide what — if
   anything — `index.html` should be).

2. **"Homepage" is ambiguous.** There is no generic homepage; `index.html` *is* the
   research center, while marketing lives in `Landing (marketing backup).html`. The product
   rule "don't make the homepage the post-context destination" needs a concrete definition
   of which file is the homepage before the route is changed.

3. **No distinct survey-intro step.** The intended flow has a "what the survey measures /
   why it matters" screen (README §3 step 5). Today the survey jumps from research →
   `survey.html`, whose controller starts at the `context` phase. The intro screen doesn't
   exist as its own step yet.

4. **Post-context route is hard-coded to `index.html` in two places**
   (`app/prelanding.jsx`) and gated in a third (`app/fit-app.jsx`). Any change to "go to
   research first" must be made consistently across these, not per-page.

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
