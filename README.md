# Fit Beyond Interest

## 1. Project overview

**Fit Beyond Interest** is a college **major-fit and switching-guidance** web app. It helps a
student figure out whether their major *actually fits them* — not just whether they find it
interesting. The app collects a small amount of context (name, college, major), shows
honest research about that specific college/major pairing, runs a short multi-dimension
survey, and produces a guidance report.

The current prototype is a **plain multi-page app**: a set of standalone `.html` entry
points that load shared React components compiled in the browser with Babel Standalone.
There is no bundler, no router library, and no build step. State is shared across pages
through `localStorage`. See `INITIAL_STATE.md` for the exact file-by-file map and
`docs/` for focused notes on routing, research data, scoring, and app variants.

## 2. Product purpose

Most "what major should I pick" quizzes only ask what a student *likes*. That is not enough
to predict whether they will stay in the major, succeed, and feel stable. Fit Beyond
Interest looks past interest alone and weighs:

- interest fit
- workload tolerance
- motivation quality
- belonging
- school fit
- career clarity
- academic confidence
- burnout and switch risk
- similar / adjacent major options
- the college / major *environment* (school vs. major effects)

The goal is **guidance, not a verdict.** The report explains *why* a fit is strong or
fragile and what to do about it — it does not just hand back a score.

## 3. Intended user flow

1. **Context entry** — first name, college, major.
2. **Context confirmation** — the user confirms their college and major, and can edit if
   anything is wrong.
3. **Personalized research page** — after confirmation the user goes to the
   **personalized school/major research page**. Not the generic homepage, not a random
   demo page.
4. **Research page content**
   - college snapshot
   - official school / data links
   - College Scorecard / NCES links when available
   - department / course / professor research links
   - similar majors
   - school-vs-major context
   - a clear marker of what is official vs. preview/demo data
5. **Survey intro** — explain what the survey measures, why the questions matter, and that
   it is guidance rather than a final verdict.
6. **Survey** — the multi-dimension questionnaire.
7. **Results / report page**
   - overall fit score
   - strongest signals
   - weakest signals
   - switch risk / burnout context
   - school-vs-major interpretation
   - similar major directions
   - next steps

> ⚠️ The current prototype does **not yet** match step 3 cleanly. After context entry it
> routes to `index.html`, and `index.html`/`research.html` are duplicate research pages
> while the survey-intro step is not a distinct screen. These gaps are documented in
> `INITIAL_STATE.md §10` and `docs/ROUTING.md`, and should be resolved with small,
> reviewed changes — not a rewrite.

## 4. Major product rules

- **Do not** turn this into a generic college-ranking website.
- **Do not** make a generic homepage the main post-context destination.
- After context entry, users go into **personalized school/major research first**.
- A marketing landing page may still exist as a **backup** (`Landing (marketing backup).html`).
- **Do not delete** the name/college/major start flow (`start.html` + prelanding).
- **Do not delete** the research page.
- **Do not delete** the survey/report logic (`fit-app.jsx`, `screens-quiz.jsx`,
  `screens-report.jsx`).
- **Do not pretend** placeholder/demo data is real.
- Default to **small, testable changes.** Don't redesign the whole product unless asked.

## 5. Design direction

- Clean, modern, student-facing.
- Calm but not boring; slightly playful but trustworthy.
- Not corporate, not overly dark.
- Motion / Framer-style references are **inspiration only**, not a mandate.
- Do not redesign the whole product unless specifically asked.
- Type: Poppins (display), Inter Tight (body), JetBrains Mono (mono).
- Tokens live in `tokens.css` / `app/colors_and_type.css`; shared component CSS in
  `app/flow.css`, `app/report.css`, `app/research.css`, `app/prelanding.css`, `app/kit.css`.

## 6. Data / source honesty rules

Every uncertain data point must be **labeled**. The research data layer
(`app/research-data.js`) already uses status labels — keep using them:

- `Official source` — verified official data (e.g. live College Scorecard / U.S. Dept. of
  Education, NCES).
- `Preview` / `Demo` — placeholder pairing shown so a page is never empty.
- `Estimated` — derived/approximate (e.g. category-based related majors).
- `Needs source` — value shown but not yet backed by a real source.

Rules:

- Never present preview/demo/estimated data as if it were official.
- When the page falls back to a demo college/major pairing, say so visibly
  (the `DataStatusBadge` "Preview" pattern).
- Prefer linking the student to the **official tool** (Scorecard, NCES, the school site)
  over restating numbers we can't verify.

## 7. External link rules

- External research links are **plain anchor tags**:
  `<a href="https://…" target="_blank" rel="noopener noreferrer">`.
- **Do not** route Google / YouTube / Reddit / external links through internal React
  routes, `window.location.href`, or iframes.
- A delegated `window.open(url, "_blank", "noopener,noreferrer")` fallback may be used to
  force a real top-level tab, but it must never navigate the current page.
- **Sandbox caveat:** the Claude/Design preview captures external destinations into an
  embedded frame, and sites like Google/YouTube/Reddit send `X-Frame-Options: DENY`, so
  they show "refused to connect" *in the preview only*. Real link testing must happen
  **locally or on a deployed site**, not in the design preview.

## 8. Development workflow

- No build step. Open the `.html` files directly, or serve the project root over a static
  server so `localStorage` and relative paths behave like production:
  ```
  cd "Major Major Major"
  python3 -m http.server 8000
  # then open http://localhost:8000/start.html
  ```
- React, ReactDOM, and Babel Standalone load from `unpkg` CDNs (pinned versions with SRI
  hashes). `.jsx` files are compiled in the browser via `<script type="text/babel">`.
- There is a parallel **dark** variant under `app-dark/` and a separate Framer/Vercel
  marketing build under `uploads/`. Treat these as separate artifacts — see
  `docs/VARIANTS.md`.
- Test external links and the full page-to-page flow in a real browser tab, not the design
  preview.

## 9. Engineering docs

- `INITIAL_STATE.md` — file map, current routing, storage keys, and known confusing areas.
- `docs/ROUTING.md` — canonical page flow, gate matrix, and route-change checklist.
- `docs/RESEARCH_DATA.md` — `window.Research`, JSON ownership, source labels, and
  College Scorecard behavior.
- `docs/SCORING.md` — survey formulas, report thresholds, risk levels, and report object
  constraints.
- `docs/VARIANTS.md` — boundaries between the light root app, dark survey variant, and
  Framer/Vercel export.

## 10. How future AI coding agents should make changes

1. **Read `INITIAL_STATE.md` first.** It maps every page to the file that controls it,
   how routing works, and where the risky areas are.
2. **Read the focused doc for the subsystem you touch.** Routing, research data, scoring,
   and app-variant boundaries each have notes under `docs/`.
3. **Make small, testable changes.** One behavior at a time. Confirm the change in a real
   browser before moving on.
4. **Respect the product rules in §4.** In particular: don't delete the start flow,
   research page, or survey/report logic, and don't make a generic homepage the
   post-context destination.
5. **Keep data honesty (§6) and external-link rules (§7) intact** in any page you touch.
6. **Don't introduce a router, bundler, or framework migration** unless the user explicitly
   asks. The app is intentionally a plain multi-page setup.
7. **Ask before redesigning.** Visual/structural overhauls need explicit sign-off.
8. When fixing the post-context route, change the destination in the **prelanding flow**
   (`app/prelanding.jsx`) and the **survey controller** gate (`app/fit-app.jsx`) — see
   `INITIAL_STATE.md §7`, §9, and `docs/ROUTING.md` — rather than rewiring every page.
