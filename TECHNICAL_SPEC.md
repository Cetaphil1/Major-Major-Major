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
/ (repo root = quiz app)
  index.html        # gated research-center alias; first-time visitors -> start.html
  start.html        # Quiz app step 1 — context flow (name → college → major → confirm)
  research.html     # Quiz app step 2 — personalized school/major research page
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
    index.html           # PUBLIC homepage; "Take the quiz" CTA -> ../start.html
    about-page/  contact/  event-page/  news/  programs/  research-page/

  LICENSE                # DO NOT TOUCH
  README.md  INITIAL_STATE.md  PRD.md  TECHNICAL_SPEC.md  DEVELOPMENT_MILESTONES.md
```

Note: the repo also contains design scraps and backups (`Landing (*).html`, `Start flow
(editable).html`, `Survey (dark).html`, `dimensions.html`, `models.html`, `app-dark/`,
`screenshots/`, `uploads/`). These are **not** part of the live flow and are slated for cleanup
in Phase 1.

## 3. Landing page vs quiz app separation

- **`/landing` is the public marketing homepage.** Its "Take the quiz" CTA links to
  `../start.html`. The landing page must not deep-link into `research.html` or
  `survey.html` because those pages assume context already exists.
- **The quiz app lives in the root `.html` files**: `start.html`, `research.html`,
  `survey.html` (plus `about.html`).
- **Root `index.html` is not the marketing homepage today.** It is a research-center alias
  with a pre-landing gate: if `UserContext.load().preLandingComplete` is false, it
  `window.location.replace("start.html")`; otherwise it renders the research center.
- **`research.html` is the canonical post-context research page.** It has the personalized
  greeting and bottom survey CTA. Keep root `index.html` in mind when changing research UI
  because it still loads the same `ResearchCenter` component.

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
- `STAGES` / `INTENT` — survey context options. `INTENT` keys are `first`, `switch`, and
  `exploring`.
- `SAMPLE_REPORT` — a worked example (CS student, elevated switch risk) used for demo/reference.
- `TOTAL_QUESTIONS` — derived count (~24).

### Answers (runtime, in `localStorage` via `fit-app.jsx`)
`answers[questionId] = 1..5` (raw Likert/frequency value).

### Report (generated object, `fit-app.jsx`)
```
{ student: { college, major, stage, intent, displayName },
  scores: { <dimKey>: 0..100 },          // HIGH = healthy
  overall, overallLabel,
  switchRisk: { level, pct, tone },
  burnoutRisk: { level, pct, tone },
  verdict, bottomLine, diagnosis,
  strongest[], weakest[], warningSigns[],
  schoolEnv, staySigns[], switchSigns[], nextSteps[], betterFit[], questions[] }
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

2. **Survey/report store (`fbi-flow-v1`)** — managed in `fit-app.jsx` (`load/save/wipe`
   around its own key). Holds `{ phase, ctx, sectionIdx, answers }`. The report object is
   recomputed from persisted `ctx` + `answers` on each render; it is not stored.

3. **College Scorecard cache (`fbi-sc-<normalized-college-name>`)** — managed by
   `app/research-data.js`. Successful live Scorecard matches are cached for about 30 days
   (`2592e6` ms). Rate-limit, network, and no-match failures are intentionally not cached.

**Rules:**
- Identity is written incrementally by `start.html` / `app/prelanding.jsx`; downstream pages
  overlay it as the source of truth and should not invent replacement context.
- `sessionStorage` is not currently used; keep `localStorage` as the shared mechanism unless a
  page needs strictly per-tab state.
- The current report "start over" action wipes `fbi-flow-v1` only and routes through
  `index.html`; it preserves `fbi-user-context-v1`. If the desired behavior changes, update
  `fit-app.jsx`, this spec, and the README manual checks together.

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
- **Risk banding (`riskLevel`)**: `pct >= 62 → High`, `46..61 → Elevated`,
  `30..45 → Moderate`, below 30 → Low.
- **Ranking:** dimensions are sorted by score; top ~3 = **strongest**, bottom ~3 = **weakest**.
- These weights are **hand-tuned, not validated** — treat as directional and revisit after
  student testing (see PRD risks).

## 8. School / major research logic (`research.jsx`, `research-data.js`, `researchSources.json`)

### Entrypoints and globals

- `research.html` is the canonical research page. `index.html` is a gated alias that renders
  the same `ResearchCenter` component after `preLandingComplete`.
- Both pages read `selectedCollege` + `selectedMajor` from `UserContext`. `research.html`
  falls back to a Swarthmore College / Political Science demo pairing with a visible
  `Preview` badge when no context exists.
- `app/research-data.js` exposes `window.Research`: `load()`, `contextFor()`,
  `collegeRecordFor()`, `profileFor()`, `nearbyFor()`, `similarMajorsFor()`,
  `buildCategories()`, `buildCategory()`, `buildOne()`, and `scorecardFor()`.
- `app/research.jsx` exports React globals used by the pages and report links:
  `DataStatusBadge`, `ResearchLinks`, `CollegeProfileCard`, `SimilarMajors`,
  `SchoolVsMajor`, `ProfessorResearchLinks`, `LinkCategory`,
  `NearbyCollegeComparison`, and `ResearchCenter`.

### Data inputs

- `Research.load()` fetches `researchSources.json`, `collegeMajors.json`,
  `nearbyColleges.json`, `collegeProfiles.json`, and `colleges.json` once, caching them in
  memory. It reuses `window.__COLLEGES` if the start flow already loaded colleges.
- `collegeProfiles.json` provides curated demo profiles for known schools. Other schools use
  live College Scorecard lookup when possible.
- `researchSources.json` templates support `direct`, `homepage`, `scoped`, and `search` link
  types. `{c}` / `{m}` are URL-encoded; `{college}`, `{major}`, and `{domain}` are filled in
  human search queries.
- `collegeMajors.json` supplies curated related-major mappings. If no curated mapping exists,
  `similarMajorsFor()` can fall back to same-category majors from `window.__MAJORS` when that
  global is already loaded; otherwise it shows `Needs source`.

### Live College Scorecard behavior

- `scorecardFor(name)` calls `https://api.data.gov/ed/collegescorecard/v1/schools` with
  `DEMO_KEY` and requests enrollment, admissions, SAT, tuition, net price, graduation, median
  earnings, and school URL fields.
- The matcher normalizes names, tries the full name and shorter prefixes, and chooses the
  best match above a score threshold.
- Successful matches show the same stat grid as curated profiles and are labeled
  `Official source · College Scorecard · matched ...`.
- A `429` rate limit shows `Coming later` with a note about the shared demo key. No match or
  network exhaustion shows `Needs source` plus manual Scorecard / NCES links.

### Provenance labels

`DataStatusBadge` currently supports:

- `Official source` — verified government/source data or a verified homepage.
- `Loaded` — local metadata from JSON files.
- `Research link` — generated search/unverified research destination.
- `Preview` — demo pairing, nearby-college prompts, or static school-vs-major prompts.
- `Estimated` — curated or category-derived related majors.
- `Needs source` — missing mapping or failed live data match.
- `Coming later` — temporarily unavailable data such as Scorecard rate limiting.

## 9. Report generation logic (`fit-app.jsx`, `screens-report.jsx`)

`fit-app.jsx` computes the report object deterministically from scores + context:
- **Verdict** — a lead/accent/body chosen by branching on interest vs. weak-signal pattern
  (e.g. "strong and built to last" vs. "real interest, draining term" vs. "the pull itself is
  fading" vs. "mixed picture, stay-able with changes").
- **Bottom line** — escalates with switch risk ("Decision point" at high risk).
- **Diagnosis** — names the *cause* of the risk (operational vs. interest) and the strongest
  signals worth protecting.
- **Stay signs / switch signs**, warning signs, school-environment factors, next steps
  (incl. "re-take after midterms"), adjacent-fit suggestions, and reflection questions.
- `screens-report.jsx` renders this object. The report reuses context from `UserContext`; no
  fabricated names (honest `nameOr` fallback).
- The report object is not persisted; refresh safety comes from persisted `ctx` + `answers`.

## 10. Routing / linking rules

- `landing/index.html` "Take the quiz" → `../start.html` (the marketing entry into the quiz).
- `start.html` (context confirmed) → `research.html`.
- `research.html` (continue) → `survey.html`.
- Root `index.html` renders the research center only after `preLandingComplete`; otherwise it
  redirects to `start.html`.
- `survey.html` runs survey → analyzing → report in-page (no separate `results.html` file
  today; report is a screen state within the survey flow).
- Guard: `survey.html` redirects to `start.html` when `preLandingComplete` is missing.
  `research.html` does not redirect; it shows the clearly labeled demo pairing. The
  `UserContext.hasIdentity()` helper exists but is not currently used as a page guard.

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
  page degrades gracefully to search links, live Scorecard attempts, and honest status labels.
- **No context on `research.html`** → Swarthmore / Political Science demo with `Preview`
  banner. **No context on `index.html` or gated `survey.html`** → redirect to `start.html`.
- **Partial survey** → unanswered dimensions default to neutral (~55). There is no reduced
  confidence UI yet, so do not claim there is one until implemented.
- **`localStorage` unavailable / cleared mid-flow** → `UserContext` returns an empty object
  safely; gated pages re-route to start and `research.html` falls back to the preview pairing.
- **Reverse-scored items** must stay correctly tagged in `data.jsx`; a mistag silently inverts a
  dimension.
- **CDN/integrity failure** → page won't render; acceptable prototype risk, but don't remove the
  pinned versions/hashes.
- **Re-take** → clears prior answers without forcing re-entry of identity. Full restart
  currently preserves `UserContext` and returns through `index.html`.

## 13. Testing considerations

- **Manual flow test (primary):** landing → "Take the quiz" → start → research → survey →
  report, verifying identity carries through unchanged at each step.
- **Root/index gate:** with empty `localStorage`, opening `index.html` should redirect to
  `start.html`; with `preLandingComplete`, it should render the research center.
- **Research demo path:** opening `research.html` with empty context should show the
  Swarthmore / Political Science `Preview` pairing.
- **Live Scorecard path:** test a non-curated school and verify either the stat grid appears
  with an `Official source` match label or the `Coming later` / `Needs source` fallback is
  honest and still links to Scorecard + NCES.
- **Scoring sanity checks:** craft all-high, all-low, and mixed answer sets and confirm
  switch/burnout risk and strongest/weakest signals move in the expected direction; verify
  reverse items flip correctly.
- **Provenance:** confirm official, loaded, research-link, preview, estimated, needs-source,
  and coming-later labels render honestly on the research page.
- **External links:** confirm new-tab behavior in a real browser; note preview-frame limitation.
- **Persistence:** refresh mid-flow and confirm context survives; verify `fbi-flow-v1` reset
  behavior separately from preserved `fbi-user-context-v1`.
- **Missing-data path:** test a college/major not in the datasets.
- **Cross-page guards:** open `index.html`, `research.html`, and `survey.html` directly with
  empty storage and verify each behaves as documented in §10 / §12.
- No automated test harness exists yet; testing is manual/observational in this phase.
