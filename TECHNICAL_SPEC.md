# Technical Spec — Fit Beyond Interest

## 1. System overview

Fit Beyond Interest is a **static, no-build, multi-page web app**. Each page is a standalone
`.html` file that loads:

- pinned CDN **React 18.3.1** + **ReactDOM** + **Babel Standalone 7.29.0** (compiled in-browser
  via `<script type="text/babel">`),
- shared **plain JS** globals (`app/user-context.js`, `app/college-snapshots.js`,
  `app/research-data.js`) loaded as ordinary `<script>` so every page can read/write the same
  state,
- shared **JSX** modules (`app/*.jsx`) that define the screens.

There is **no bundler, no router library, no server, and no build step.** Cross-page state is
shared through `localStorage`. Navigation between app pages is plain anchor/`window.location`
links between `.html` files.

## 2. Current folder / page structure

```
/ (repo root = static app + legacy quiz entry points)
  index.html        # Legacy gated research shell; redirects to start.html only when context is missing
  start.html        # Quiz app step 1 — context flow (name → college → major → confirm)
  research.html     # Canonical quiz app step 2 — personalized school/major research page
  survey.html       # Quiz app step 3+4 — survey + analyzing + report controller
  about.html        # explainer / about page

  # Shared app source (light theme) — the real code
  app/
    user-context.js        # localStorage identity store -> window.UserContext
    college-snapshots.js   # college snapshot dataset (window global)
    research-data.js       # research link templates + data-honesty status labels
    data.jsx               # DIMENSIONS, SECTIONS (quiz), COLLEGES/MAJORS, SAMPLE_REPORT
    primitives.jsx         # shared UI primitives
    screens-context.jsx    # name/college/major context screens
    prelanding.jsx         # start.html screen controller
    research.jsx           # research page rendering
    screens-quiz.jsx       # survey question screens
    screens-report.jsx     # report rendering
    fit-app.jsx            # survey.html flow controller + SCORING + report generation
    *.css                  # flow.css, report.css, research.css, prelanding.css, kit.css, ...

  # Data (root, JSON)
  colleges.json          # college directory (id, name, city, state, control, level, alias[])
  majors.json            # major directory (name, category, cipCode, keywords[])
  collegeMajors.json     # major -> related/adjacent majors (for comparison, not recs)
  collegeProfiles.json   # per-college profile detail
  nearbyColleges.json    # nearby-school suggestions
  researchSources.json   # outbound research link templates + provenance metadata

  # Public homepage (marketing site)
  landing/
    index.html           # PUBLIC homepage export; quiz CTA must enter ../start.html
    about-page/  contact/  event-page/  news/  programs/  research-page/

  LICENSE                # DO NOT TOUCH
  README.md  INITIAL_STATE.md  PRD.md  TECHNICAL_SPEC.md  DEVELOPMENT_MILESTONES.md
```

Notes:
- `research.html` is the canonical research page in the live quiz flow. `index.html` still
  carries an older research shell with a pre-landing gate; it is not a root redirect today.
- The repo also contains design scraps and backups (`Landing (*).html`, `Start flow
  (editable).html`, `Survey (dark).html`, `dimensions.html`, `models.html`, `app-dark/`,
  `uploads/`). These are **not** part of the live flow and are slated for cleanup in Phase 1.

## 3. Landing page vs quiz app separation

- **`/landing` is the public homepage** (marketing site). The current root `index.html`
  does **not** redirect there yet; implementing that redirect is a separate cleanup step.
- **The quiz app lives in the root `.html` files**: `start.html`, `research.html`,
  `survey.html` (plus `about.html`).
- **The canonical doorway from landing into the quiz is the "Take the quiz" CTA**, which
  must link to the quiz start page (`../start.html` from `landing/index.html`). The landing
  page must not deep-link into `research.html` or `survey.html` because those assume the
  student has had a chance to enter context.
- The `landing/` pages are generated/minified Framer exports. When refreshing them, verify
  that product copy stays on Fit Beyond Interest and that quiz CTAs still point to
  `start.html` instead of the template's original school/program routes.

## 4. Frontend structure

- **Rendering:** each page mounts a React tree into `<div id="root">`. JSX is transpiled at load
  time by Babel Standalone (acceptable for a prototype; a build step is a future optimization).
- **Screen modules** are loaded per page in dependency order via `<script type="text/babel">`.
  Example load order in `survey.html`: `data.jsx` → `primitives.jsx` → `screens-context.jsx` →
  `screens-quiz.jsx` → `research.jsx` → `screens-report.jsx` → `fit-app.jsx` (controller last).
- **Plain-JS globals first:** `user-context.js`, `college-snapshots.js`, `research-data.js` load
  as ordinary scripts before the Babel scripts so JSX can read `window.UserContext`, etc.
- **State sharing:** there are no props passed across pages — pages communicate only through
  `localStorage` (see §6).

## 5. Data structures

### Colleges (`colleges.json`)
```json
{ "id": "uc-berkeley", "name": "University of California, Berkeley",
  "city": "Berkeley", "state": "CA", "control": "Public",
  "level": "4-year", "alias": ["cal", "ucb", "berkeley"] }
```

### Majors (`majors.json`)
```json
{ "name": "Computer Science", "category": "Computer and Information Sciences",
  "cipCode": "11.0701", "keywords": ["cs","software","programming","coding"] }
```

### Related majors (`collegeMajors.json`)
`similarMajors[<major>] = [{ name, relation }]` — adjacent fields to compare, explicitly **not**
recommendations. Carries a `_meta.status: "Estimated"` provenance flag.

### Research link templates (`researchSources.json`)
`categories[] -> links[]` where each link is either `type: "direct"` (a URL template with
`{c}` = URL-encoded college, `{m}` = URL-encoded major) or a search query template against an
engine (google/youtube/maps/reddit). Each link carries a `status` provenance label
("Official source" vs "Research link"). Nothing is scraped or stored; links only build URLs.

### Quiz questions & scoring model (`app/data.jsx`)
- `DIMENSIONS` — 8 dimensions: `interest, confidence, workload, motivation, career, school,
  belonging, burnout` (each with `key, name, color, short`).
- `SECTIONS` — one section per dimension, each with `title, subtitle, scale` (AGREE = 5-point
  Likert, or FREQ = 5-point frequency), `anchors`, and 3 `questions`.
  - Each question: `{ id, text, reverse? }`. `reverse: true` flips the answer (see §7).
- `STAGES` / `INTENT` — context options (e.g. intent: staying / exploring / switching).
- `SAMPLE_REPORT` — a worked example (CS student, elevated switch risk) used for demo/reference.
- `TOTAL_QUESTIONS` — derived count (~24).

### Answers (runtime, in `localStorage` via `fit-app.jsx`)
`answers[questionId] = 1..5` (raw Likert/frequency value).

### Report (generated object, `fit-app.jsx`)
```
{ student: { college, major, stage, intent, displayName },
  scores: { <dimKey>: 0..100 },          // HIGH = healthy
  switchRisk: { level, pct, tone },
  burnoutRisk: { level, pct, tone },
  verdict, bottomLine, diagnosis,
  strongest[], weakest[], staySignals[], switchSigns[], nextSteps[], reflectionQuestions[] }
```

## 6. localStorage / sessionStorage plan

Two cooperating stores, both in `localStorage` (survives refresh; intentionally persistent so a
reload keeps context):

1. **`fbi-user-context-v1`** — managed by `window.UserContext` (`app/user-context.js`). Single
   source of truth for identity/context:
   ```
   { displayName, selectedCollege, selectedMajor, contextConfirmed, preLandingComplete }
   ```
   API: `load()`, `save()`, `update(patch)`, `clear()`, `nameOr(fallback)`, `hasIdentity()`,
   `relatedMajorsFor(major, db, n)`. Written by `start.html`, read by `research.html` and
   `survey.html`.

2. **Survey/report store** — managed in `fit-app.jsx` (`load/save/wipe` around its own key).
   Holds quiz `answers`, stated `intent/stage`, and the generated report so the report page can
   re-render without recomputing.

**Rules:**
- Identity is written once in `start.html`; downstream pages read it and never re-ask.
- `sessionStorage` is not currently used; keep `localStorage` as the shared mechanism unless a
  page needs strictly per-tab state.
- A "start over" action calls `UserContext.clear()` + survey `wipe()`.

## 7. Quiz scoring logic (`fit-app.jsx`)

- Raw answers are **1–5**. For `reverse: true` items, the value is flipped: `score = 6 - raw`.
  This makes **higher always = healthier** for every dimension (e.g. a high *burnout* dimension
  score means *resilient*, not *burned out*).
- **Per-dimension score (`dimScore`)** = average of that section's (reverse-adjusted) answers,
  normalized to **0–100**. Missing/unanswered dimensions default to ~55 (neutral).
- **Burnout risk %** is derived from the burnout dimension (low burnout-resilience → high burnout
  risk).
- **Switching risk %** is a weighted blend of the operational + belonging signals, nudged by
  stated intent:
  ```
  switchPct = round( 100 - (workload*0.9 + burnout*1.0 + belonging*0.8
                            + motivation*0.7 + school*0.6 + career*0.5) / 4.5 )
  if intent == "switch":    switchPct += 8
  if intent == "exploring": switchPct += 3
  switchPct = clamp(switchPct, 4, 96)
  ```
- **Risk banding (`riskLevel`)**: `pct >= 62 → High`; mid band → Moderate/Elevated; low →
  Low/Manageable (exact thresholds live in `riskLevel`).
- **Ranking:** dimensions are sorted by score; top ~3 = **strongest**, bottom ~3 = **weakest**.
- These weights are **hand-tuned, not validated** — treat as directional and revisit after
  student testing (see PRD risks).

## 8. School / major research logic (`research.jsx`, `research-data.js`, `researchSources.json`)

- Read `selectedCollege` + `selectedMajor` from `UserContext`.
- Render a **college snapshot** from `college-snapshots.js` / `collegeProfiles.json`.
- Build outbound links from `researchSources.json` by substituting `{c}`/`{m}` (URL-encoded)
  into direct URL templates, or composing search queries for google/youtube/maps/reddit.
- Show **related majors** for comparison from `collegeMajors.json` (labeled "not
  recommendations").
- Surface a **school-vs-major** framing (is the strain coming from the school environment or the
  field?).
- Every item carries a **provenance label** ("Official source" vs "Research link" vs
  "Estimated") so students can tell verified data from demo/estimated content.

## 9. Report generation logic (`fit-app.jsx`, `screens-report.jsx`)

`fit-app.jsx` computes the report object deterministically from scores + context:
- **Verdict** — a lead/accent/body chosen by branching on interest vs. weak-signal pattern
  (e.g. "strong and built to last" vs. "real interest, draining term" vs. "the pull itself is
  fading" vs. "mixed picture, stay-able with changes").
- **Bottom line** — escalates with switch risk ("Decision point" at high risk).
- **Diagnosis** — names the *cause* of the risk (operational vs. interest) and the strongest
  signals worth protecting.
- **Stay signals / switch signals**, **next steps** (incl. "re-take after midterms"), and
  **reflection questions**.
- `screens-report.jsx` renders this object. The report reuses context from `UserContext`; no
  fabricated names (honest `nameOr` fallback).

## 10. Routing / linking rules

- `landing/index.html` "Take the quiz" → `../start.html` (the intended public entry into
  the quiz).
- `start.html` (context confirmed) → `research.html`.
- `research.html` (continue) → `survey.html`. If context is missing, the page falls back to
  the Swarthmore College / Political Science demo pairing and labels it with `Preview`.
- `survey.html` runs survey → analyzing → report in-page (no separate `results.html` file
  today; report is a screen state within the survey flow).
- Guard: `survey.html` checks `UserContext.load().preLandingComplete` in `app/fit-app.jsx`
  and routes empty-context visitors back to `start.html`.
- Legacy root behavior: `index.html` is another research shell. It checks
  `preLandingComplete` and redirects to `start.html` when false; when true, it renders a
  research page. Treat `research.html` as canonical until `index.html` is deliberately
  changed to a homepage redirect.

## 11. External link rules

- All research links are real `<a href="https://…" target="_blank" rel="noopener noreferrer">`.
- A delegated click handler additionally calls `window.open(url, "_blank", "noopener,
  noreferrer")` as a fallback to force a true top-level new tab. It must **never** navigate the
  current page, use internal routes, iframes, or `window.location.href`.
- Known limitation: embedded design-preview environments capture the destination in a frame, and
  sites sending `X-Frame-Options: DENY` (Google/YouTube/Reddit) show "refused to connect". Links
  work normally in a real browser tab; document this rather than "fix" it.

## 12. Edge cases

- **Missing college/major** in datasets → manual-entry fallback (`isManual: true`); research
  page degrades gracefully to search links + "Estimated" labels.
- **No context on `research.html`** → demo research pairing with a visible `Preview` label.
- **No context on `survey.html`** → redirect to `start.html`.
- **Partial survey** → unanswered dimensions default to neutral (~55); ensure the report flags
  reduced confidence rather than presenting it as complete.
- **`localStorage` unavailable / cleared mid-flow** → `UserContext` returns an empty object
  safely; downstream pages re-route to start.
- **Reverse-scored items** must stay correctly tagged in `data.jsx`; a mistag silently inverts a
  dimension.
- **CDN/integrity failure** → page won't render; acceptable prototype risk, but don't remove the
  pinned versions/hashes.
- **Re-take** → must clear prior answers (survey `wipe()`) without forcing re-entry of identity.

## 13. Testing considerations

- **Manual flow test (primary):** landing → "Take the quiz" → start → research → survey →
  report, verifying identity carries through unchanged at each step.
- **Scoring sanity checks:** craft all-high, all-low, and mixed answer sets and confirm
  switch/burnout risk and strongest/weakest signals move in the expected direction; verify
  reverse items flip correctly.
- **Provenance:** confirm official vs. estimated labels render on the research page.
- **External links:** confirm new-tab behavior in a real browser; note preview-frame limitation.
- **Persistence:** refresh mid-flow and confirm context survives; "start over" clears both
  stores.
- **Missing-data path:** test a college/major not in the datasets.
- **Cross-page guards:** open `research.html` and `survey.html` directly with empty storage.
  `research.html` should show the Preview demo state; `survey.html` should redirect to
  `start.html`.
- No automated test harness exists yet; testing is manual/observational in this phase.
