# Development Milestones — Fit Beyond Interest

Eight phases, in order. Each phase lists a **goal**, **deliverables**, and what **"done" looks
like**. Scope is intentionally realistic for a no-build, static, multi-page app with a small
test audience. Constraints throughout: do not touch `LICENSE`; no redesign of the existing
visual system; no merge/rebase/force-push.

---

## Phase 1 — Planning and repo cleanup

**Goal:** establish the source of truth for what's built and clear away dead/duplicate files so
the live flow (`landing/` + `start.html` → `research.html` → `survey.html`) is unambiguous.

**Deliverables**
- `PRD.md`, `TECHNICAL_SPEC.md`, `DEVELOPMENT_MILESTONES.md` (this set) committed.
- An inventory separating **live files** from **scraps/backups/duplicates** (e.g.
  `research.html` as the canonical research page, `index.html` as the guarded research
  variant, `landing/` as a generated marketing export, `Landing (*).html`, `Start flow
  (editable).html`, `Survey (dark).html`, `app-dark/`, design scrap `.html` files,
  `screenshots/`, `uploads/`).
- A cleanup plan: which scraps to archive vs. delete (no deletion of `LICENSE`).

**Done looks like**
- The three planning docs exist and match the actual code.
- There is one documented, unambiguous live path from landing into the report, with the dead
  files clearly labeled and a plan (not necessarily executed yet) for removing them.

---

## Phase 2 — Landing page as public entry

**Goal:** make `/landing` the public homepage and ensure the **only** way into the quiz is the
"Take the quiz" CTA → `start.html`.

**Deliverables**
- Site root `index.html` reliably redirects to `landing/index.html`.
- `landing/index.html` "Take the quiz" CTA points to `../start.html` (correct relative path).
- Confirm landing does **not** deep-link into `research.html`/`survey.html`.

**Current source gap:** this phase is not complete yet. Root `index.html` currently remains a
guarded research-center entry, and the generated `landing/` export should be verified before
it is documented as the public quiz doorway.

**Done looks like**
- Visiting the site root lands on the marketing homepage.
- Clicking "Take the quiz" — and only that — enters the quiz app at `start.html`.
- No other landing link jumps past context entry.

---

## Phase 3 — Quiz start / context flow

**Goal:** collect and confirm name, college, and major, and persist them via `UserContext`.

**Deliverables**
- `start.html` flow: first name → college (from `colleges.json`, alias-aware search) → major
  (from `majors.json`, keyword search) → confirm/edit, plus intent (staying/exploring/switching).
- Writes `{ displayName, selectedCollege, selectedMajor, contextConfirmed, preLandingComplete }`
  to `localStorage` via `window.UserContext`.
- Manual-entry fallback for colleges/majors not in the datasets (`isManual: true`).
- On confirm → navigate to `research.html`.

**Done looks like**
- A student can enter and confirm identity, including a manual entry, and the saved context is
  correct in `localStorage`.
- Confirming routes to the research page; a refresh keeps the context.

---

## Phase 4 — School / major research page

**Goal:** show a personalized, honestly-labeled research page for the student's specific
college/major before the quiz.

**Deliverables**
- `research.html` reads context from `UserContext` and renders:
  - college snapshot (`college-snapshots.js` / `collegeProfiles.json`),
  - official links (College Scorecard, NCES) + department/course/professor search links from
    `researchSources.json` (with `{c}`/`{m}` substitution),
  - related majors from `collegeMajors.json` ("not recommendations"),
  - a school-vs-major framing,
  - provenance labels (Official source / Research link / Estimated).
- External links open in a real new tab per the external-link rules.
- Guard: redirect to `start.html` if no identity.
- Continue → `survey.html`.

**Done looks like**
- The page reflects the chosen college + major, links resolve to the right destinations and open
  in a new tab, provenance is visible, and "continue" reaches the survey.

---

## Phase 5 — Quiz questions and scoring

**Goal:** run the eight-dimension survey and compute scores correctly.

**Deliverables**
- `survey.html` renders the 8 `SECTIONS` from `data.jsx` (3 items each), correct scales
  (AGREE/FREQ), with a survey intro framing it as guidance.
- Answers stored as `answers[id] = 1..5`.
- Scoring in `fit-app.jsx`: reverse items flip (`6 - raw`), per-dimension 0–100 (`dimScore`),
  switching-risk and burnout-risk %s and bands per the spec.
- "Analyzing" transition before the report.

**Done looks like**
- All ~24 items render and accept answers; reverse items flip correctly; all-high / all-low /
  mixed answer sets move switch/burnout risk and strongest/weakest signals in the expected
  direction.

---

## Phase 6 — Results / report page

**Goal:** generate and render the guidance report that explains the *why*.

**Deliverables**
- `fit-app.jsx` builds the report object (verdict, scores, switchRisk, burnoutRisk, diagnosis,
  strongest/weakest, stay signals, switch signals, next steps, reflection questions) reusing
  `UserContext` (honest `nameOr` fallback).
- `screens-report.jsx` renders it: overall verdict, per-dimension 0–100, strongest/weakest,
  switch + burnout context, school-vs-major interpretation, next steps.
- Target behavior: "Start over" clears both stores (identity + survey) and returns to
  `start.html`; report can be re-rendered without recomputing. Current implementation clears
  only the survey/report store and returns to `index.html`; see `TECHNICAL_SPEC.md §6`.

**Done looks like**
- The report shows the correct student context and scores, names cause (workload vs. field),
  gives concrete next steps, and reads as guidance rather than a verdict. Re-take works.

---

## Phase 7 — Testing with real students

**Goal:** validate flow integrity and perceived accuracy with the developer's college peers.

**Deliverables**
- A short test script: complete the full flow on a real browser (not a preview frame).
- A feedback form covering completion, "does this sound like me?", cause clarity, and one
  actionable next step (PRD success metrics).
- A logged list of dataset gaps (missing colleges/majors) and confusing items.

**Done looks like**
- Several students complete landing → report end-to-end with no dead ends; ≥70% say the
  strongest/weakest signals sound like them and can name a next step; gaps and fixes are
  captured for Phase 8.

---

## Phase 8 — Polish and presentation

**Goal:** tighten copy, fix the issues found in testing, and make the project presentable —
without redesigning.

**Deliverables**
- Fixes for the highest-impact testing findings (broken links, confusing items, dataset gaps,
  scoring weight tweaks if clearly warranted).
- Consistent copy/labels; provenance labels accurate; external-link preview limitation
  documented.
- Updated `README.md` quick-start (how to run the static files) and a short demo path for
  presentation.

**Done looks like**
- The full flow runs cleanly on a real browser, known issues from Phase 7 are resolved or
  documented, and there's a repeatable demo path from landing to report.
