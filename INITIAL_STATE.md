# INITIAL_STATE.md - Fit Beyond Interest (current implementation map)

This document is the source-of-truth orientation map for the current repository. It describes
what is implemented today, including the recently added `landing/` marketing export and the
quiz flow handoff into `research.html`.

For product intent, see `README.md` and `PRD.md`. For the static app architecture and scoring
details, see `TECHNICAL_SPEC.md`.

---

## 1. Current file structure and live surfaces

Top level (project root):

```
landing/                       # current Framer-export marketing site
start.html                     # quiz app entry: name -> college -> major -> confirm
research.html                  # canonical personalized research page for the quiz app
survey.html                    # survey + analyzing + report controller
index.html                     # legacy gated research entry; not the public landing redirect
about.html                     # older explainer page outside the landing export

Landing (marketing backup).html  # older marketing backup
Landing (original).html          # older marketing page
Start flow (editable).html     # self-contained reference copy of the start flow
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
uploads/                       # older Framer/Vercel export bundle (.mjs, _redirects, vercel.json)
assets/                        # mark.svg, logos
screenshots/                   # design reference PNGs (not used at runtime)
```

`start.html` imports `app/flow.css`, `app/prelanding.css`, `app/user-context.js`,
`app/college-snapshots.js`, `app/data.jsx`, `app/screens-context.jsx`, and
`app/prelanding.jsx`. `Start flow (editable).html` is a flattened, self-contained mirror of
that flow and is useful only as a static reference.

### Landing export inventory

The `landing/` directory is a static Framer export. Each page is generated HTML with embedded
Framer hydration metadata. Treat it as a marketing artifact: small link/copy patches are OK,
but do not move quiz app logic into these generated files.

Current landing pages:

```
landing/index.html
landing/about-page/index.html
landing/contact/index.html
landing/programs/index.html
landing/programs/b-sc-in-computer-science/index.html
landing/research-page/index.html
landing/research-page/reading-belonging-and-career-clarity/index.html
landing/research-page/school-effect-vs-subject-fit/index.html
landing/news/index.html
landing/news/climate-solutions/index.html
landing/news/environmental-impact/index.html
landing/news/renewable-resources/index.html
landing/news/sustainable-development/index.html
landing/news/technological-advancements/index.html
landing/event-page/index.html
landing/event-page/award-winning-student-play/index.html
landing/event-page/international-fashion-parade/index.html
landing/event-page/student-startup-pitch-competition/index.html
```

All landing pages currently include a depth-adjusted quiz CTA to `start.html`:

- `landing/index.html` -> `../start.html`
- one-level landing pages -> `../../start.html`
- two-level article/program/event pages -> `../../../start.html`

---

## 2. Which file controls the start / context flow

- **Entry:** `start.html`
- **Logic:** `app/prelanding.jsx` (the four-step flow: name -> college -> major -> confirm/preview)
- **Supporting:** `app/screens-context.jsx`, `app/data.jsx`, `app/college-snapshots.js`,
  `app/user-context.js`
- **Self-contained editable mirror:** `Start flow (editable).html` (same screens, inlined -
  useful as a static reference, not wired to the shared `app/` modules)

On finish or skip, `app/prelanding.jsx` sets `preLandingComplete` in `UserContext` and routes
to `research.html`.

## 3. Which file controls the research page

- **Canonical quiz entry:** `research.html`
- **Legacy duplicate:** `index.html` still renders a similar research page with a pre-landing
  gate; it does not currently redirect to `landing/index.html`.
- **Logic:** `app/research.jsx` exports `ResearchCenter` and `DataStatusBadge`. Each HTML
  shell defines a small inline `ResearchPage()` that reads the saved college/major and renders
  `<ResearchCenter college={...} major={...} />`, falling back to a Swarthmore College /
  Political Science demo pairing labeled **Preview** when no context is saved.
- **Data:** `app/research-data.js` (links + status labels), `researchSources.json`

`research.html` is newer and has the clearer quiz continuation copy plus an end-of-page CTA
to `survey.html`. Prefer updating `research.html` first if the research page needs behavior or
copy changes, and decide deliberately whether the legacy `index.html` should be kept in sync.

## 4. Which file controls the landing page

- **Current marketing site:** `landing/index.html` and the nested pages listed in section 1.
  These are generated Framer-export HTML files.
- **Older marketing backups:** `Landing (marketing backup).html`, `Landing (original).html`,
  and the separate `uploads/` export.
- **Root `index.html`:** still a legacy research-center shell guarded by `UserContext`.
  Redirecting the site root to `landing/index.html` remains an implementation gap, not current
  behavior.

## 5. Which file controls the survey

- **Entry:** `survey.html`
- **Logic:** `app/screens-quiz.jsx` (quiz screens) driven by `app/fit-app.jsx` (the overall
  flow controller). Survey questions/dimensions come from `app/data.jsx`.
- **Dark variant:** `Survey (dark).html` + `app-dark/`.

## 6. Which file controls the report / results

- **Controller + scoring:** `app/fit-app.jsx` - computes dimension scores, overall fit,
  switch risk, burnout risk, and builds the narrative report object.
- **Report UI:** `app/screens-report.jsx`
- Both are loaded by `survey.html`. The report is the final `phase` of the `fit-app.jsx`
  state machine (`context → quiz → analyzing → report`), not a separate HTML page.

---

## 7. How routing currently works

- **Plain multi-page app.** Each screen is its own `.html` file. Navigation is done with
  plain anchors and `window.location.href` / `window.location.replace` - **no React Router,
  no bundler, no hash routing.**
- React + ReactDOM + Babel Standalone load from `unpkg` CDNs; `.jsx` is compiled in the
  browser via `<script type="text/babel">`.
- **Marketing-to-quiz links:** every page in `landing/` links its quiz CTA to `start.html`
  using a relative path appropriate for that page depth.
- **Context handoff:** `app/prelanding.jsx` routes both finish and skip paths to
  `research.html`.
- **Research-to-survey links:** `research.html` links to `start.html` ("Change college /
  major") and `survey.html` ("Take the survey").
- **Survey gate:** `app/fit-app.jsx` checks `UserContext.load().preLandingComplete`. If it is
  false, it `window.location.replace("start.html")`.
- **Survey/report state:** inside `survey.html`, the `context -> quiz -> analyzing -> report`
  flow is React state, not URLs.
- **Restart gap:** `app/fit-app.jsx` still defines `toLanding()` as `window.location.href =
  "index.html"`, so the report "Start over" path returns to the legacy root research shell
  after wiping state. If the public-entry redirect is implemented later, update this together
  with the root entry decision.
- **External links** are plain `<a target="_blank" rel="noopener noreferrer">`, with an
  optional delegated `window.open` fallback. They are intentionally **not** routed through
  any internal mechanism.

## 8. Where localStorage / sessionStorage is used

Two separate `localStorage` keys (no `sessionStorage`):

- **`fbi-user-context-v1`** - managed by `app/user-context.js` (`window.UserContext`).
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
  Read/written by `start.html`/prelanding and read by `research.html`, `index.html`, and
  `survey.html`.

- **`fbi-flow-v1`** - managed by `app/fit-app.jsx`. Survey/report progress:
  `{ phase, ctx, sectionIdx, answers }`. `fit-app.jsx` overlays the `UserContext` identity
  on top of this as the source of truth for name/college/major.

Other files also touch storage in scraps/variants: `app-dark/fit-app.jsx`,
`dimensions.html`, `models.html`, `model-iceberg.html`, `iceberg.jsx`, `animations.jsx`.

## 9. What currently happens after the user enters name / college / major

In `app/prelanding.jsx`, finishing the context flow:

1. Calls `UserContext.update({ preLandingComplete: true, contextConfirmed: true })`.
2. Runs `window.location.href = "research.html"`.

Skipping the intro calls `UserContext.update({ preLandingComplete: true })` and also routes
to `research.html`.

That means the implemented post-context path is now explicit:

```
landing/* -> start.html -> research.html -> survey.html -> report phase inside survey.html
```

`app/fit-app.jsx` independently enforces the survey gate: on mount, if there is no
`UserContext` or `!preLandingComplete`, it sends the visitor back to `start.html`.

---

## 10. Risky or confusing areas in the current project

1. **Root `index.html` is not the public landing redirect.** The spec now describes
   `/landing` as the public homepage and says the root should redirect there, but the code
   still renders a gated research page at `index.html`. Decide whether to implement the root
   redirect or keep `index.html` as a legacy research entry.

2. **`index.html` and `research.html` can drift.** `research.html` is the canonical
   post-context research page and includes the clearer greeting/end CTA. `index.html` still
   renders a similar page and should not be edited accidentally as the only research surface.

3. **Generated landing HTML is hard to maintain by hand.** The `landing/` files are Framer
   exports with long single-line hydration blobs. Link patches are manageable; structural
   redesigns should happen at the source/export level when possible.

4. **No distinct survey-intro step.** The intended flow has a "what the survey measures /
   why it matters" screen. Today `research.html` links directly to `survey.html`, whose
   controller starts at the `context` phase before entering the quiz.

5. **Several parallel artifacts remain.** The live light app (`app/`), the current Framer
   landing export (`landing/`), a dark variant (`app-dark/`), older marketing backups, and an
   older `uploads/` export all coexist. Edits to one do **not** propagate to the others.

6. **CDN + Babel-in-browser.** No build step or dependency lockfile; React/Babel are pinned
   via SRI on `unpkg`. Offline or CDN outages break the app, and in-browser Babel compile is
   slow/dev-only - acceptable for this prototype, not a production architecture.

7. **Design-preview sandbox vs. real behavior.** External links and full page navigation
   misbehave inside the Claude/Design preview (`X-Frame-Options: DENY`). Don't diagnose
   routing/link bugs from the preview — test locally or on a deployed site.

8. **Demo/fallback data.** The research page falls back to Swarthmore / Political Science
   when no context is saved. It is labeled **Preview**, but any change must preserve that
   honesty labeling (README §6).

## 11. Maintenance notes for future changes

- For user-flow changes, verify the path in code before editing docs:
  - `landing/**/index.html` for CTA hrefs,
  - `app/prelanding.jsx` for the context handoff,
  - `research.html` for the research-to-survey CTA,
  - `app/fit-app.jsx` for the survey guard, phase machine, and restart destination,
  - `app/screens-report.jsx` for report links back to research.
- Keep `landing/` and the quiz app separate. Landing pages should send users to
  `start.html`; they should not deep-link into `research.html` or `survey.html`.
- Preserve data-honesty labels (`Preview`, `Estimated`, `Official source`, etc.) when
  touching research or report surfaces.
- If root `index.html` is changed to redirect to `landing/index.html`, update this file,
  `README.md`, and `TECHNICAL_SPEC.md` in the same PR so agents do not follow stale routing
  instructions.
