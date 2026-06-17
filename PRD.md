# PRD — Fit Beyond Interest

## 1. Project overview

**Fit Beyond Interest** is a college **major-fit and switching-guidance** web app. A student
enters their name, college, and major. The app then (1) shows honest research context about
that specific college/major pairing, (2) runs a short multi-dimension quiz, and (3) produces a
guidance report that explains whether the major *actually fits them* — not just whether they
find it interesting.

It is built as a no-build multi-page app: standalone `.html` entry points load shared React
components compiled in the browser with Babel Standalone. There is no bundler, no router
library, and no server. State is shared across pages through `localStorage`.

This is **not** a college ranking site and **not** a "what major should I pick?" generator. It
assumes the student already has a major and helps them decide whether to stay, strengthen it,
or switch.

## 2. Problem statement

Most "what major should I pick" quizzes only measure what a student *likes*. Interest alone
does not predict whether a student will stay in a major, succeed in it, or stay healthy doing
it. Students switch majors — or quietly burn out in one — for reasons interest quizzes never
surface: unsustainable workload, weak belonging, motivation that's all external pressure,
fading career clarity, or a school/program environment that doesn't fit how they work.

Students currently have no honest, low-stakes way to pressure-test their *current* major
against all of those signals at once, with research context attached to their specific school
and major.

## 3. Target users

- **Primary:** undergraduates (and committed admits) who already have a declared or intended
  major and are unsure whether it fits — especially "considering switching" and "exploring"
  students.
- **Secondary:** high-school seniors / incoming first-years stress-testing a planned major
  before committing.
- **Tertiary (read-only):** advisors, counselors, and parents the student chooses to share the
  report with.

The first audience for real testing is the developer's own peer group of current college
students (see Phase 7).

## 4. User needs

- Understand **why** a major does or doesn't fit, not just receive a score.
- See **honest, sourced research** about their specific college + major before answering, so
  the quiz feels grounded rather than generic.
- Answer quickly — a short quiz, not a 100-item personality test.
- Get a result that distinguishes "the *workload* is hard right now" from "the *field itself*
  isn't yours."
- Feel that the tool is **guidance, not a verdict** — actionable next steps, not a label.
- Keep their data private (nothing leaves the browser).

## 5. Goals and non-goals

### Goals
- Measure fit across eight dimensions: **interest, skill confidence, workload tolerance,
  motivation, career clarity, school fit, belonging, burnout risk** — plus two derived risks:
  **switching risk** and **burnout risk**.
- Give every student a **personalized research page** for their college/major pairing before
  the quiz.
- Produce a report that names the **strongest and weakest signals**, the **likely cause** of
  any switch risk, and **what to do next**.
- Keep the whole flow runnable as static files with no backend.
- Be honest about data provenance: clearly mark official sources vs. estimated/demo data.

### Non-goals
- No college rankings or "best major" recommendations.
- No account system, login, or server-side storage in this phase.
- No AI/LLM generation of the report in this phase — scoring and narrative are deterministic.
- No prediction of graduation, GPA, or admissions outcomes.
- No clinical or mental-health diagnosis; burnout signals are guidance, not assessment.
- No redesign of the existing visual system in this phase.

## 6. Core features

1. **Landing page (`/landing`)** — public marketing homepage. The only path into the quiz app
   is the "Take the quiz" CTA, which links to `start.html`.
2. **Context start flow (`start.html`)** — collect first name, college, and major; confirm and
   allow editing. Backed by `colleges.json`, `majors.json`, and `UserContext` (localStorage).
3. **Personalized research page (`research.html`)** — college snapshot, official school/data
   links (College Scorecard, NCES), department/course/professor search links, similar majors,
   and a school-vs-major framing, with provenance labels.
4. **Quiz / survey (`survey.html`)** — eight sections (one per dimension), 3 items each (~24
   items), Likert/frequency scales with reverse-scored items.
5. **Report (rendered in `survey.html` flow)** — overall verdict, per-dimension 0–100 scores,
   strongest/weakest signals, switching-risk and burnout-risk levels, a diagnosis of the
   *cause*, stay-vs-switch signals, and concrete next steps.
6. **Shared context** — name/college/major persist across all pages so the quiz never re-asks
   and the report reuses them.

## 7. Intended user flow

1. **Landing** (`/landing/index.html`) → student clicks **"Take the quiz."**
2. **Start** (`start.html`) → enter first name → select college → select major → confirm/edit
   context → (intent: staying / exploring / switching).
3. **Research** (`research.html`) → review personalized school/major research, then continue.
4. **Survey intro** → what it measures and that it's guidance, not a verdict.
5. **Survey** (`survey.html`) → answer the eight sections.
6. **Analyzing** → brief transition.
7. **Report** → verdict, scores, risks, diagnosis, stay/switch signals, next steps, option to
   re-take.

## 8. Success metrics

Because there is no backend, metrics are observational and test-session based, not analytics
pipelines:

- **Completion rate** — % of students who start the quiz and reach the report (target ≥ 70% in
  test sessions).
- **Flow integrity** — name/college/major entered once are correct on the research page and the
  report 100% of the time.
- **Perceived accuracy** — in testing, ≥ 70% of students say the report's strongest/weakest
  signals "sound like me."
- **Actionability** — ≥ 70% of testers can name one next step they'd actually take.
- **Cause clarity** — testers can correctly restate whether their risk is "workload" vs.
  "the field itself."
- **No dead ends** — every page links forward correctly; external links open in a new tab.

## 9. Risks and assumptions

### Assumptions
- Students answer honestly; the quiz is self-report.
- The college/major datasets cover enough schools/majors for testers (with a manual-entry
  fallback for misses).
- Babel-in-browser performance is acceptable for the test audience's devices.
- `localStorage` is available and not cleared mid-flow.

### Risks
- **Self-report bias** — burnout/belonging answers may be skewed by the student's mood that
  week. Mitigation: report explicitly frames it as a snapshot and suggests a re-take after
  midterms.
- **Data coverage gaps** — a college or major may be missing. Mitigation: manual-entry path and
  honest "estimated" provenance labels.
- **External-link preview issues** — embedded preview environments (e.g. design previews) block
  framed external sites (X-Frame-Options). Mitigation: links open in a real top-level tab;
  documented as a preview-only limitation.
- **Scoring credibility** — deterministic weights are hand-tuned, not validated. Mitigation:
  treat scores as directional guidance; revisit weights after student testing.
- **No-build fragility** — pinned CDN React/Babel via integrity hashes; a CDN outage breaks the
  app. Acceptable for a prototype.

## 10. Future expansion ideas

- Optional shareable/printable report (PDF or link).
- Expanded college/major datasets and verified official homepages.
- "Compare to similar majors" interactive view using `collegeMajors.json`.
- Re-take + trend view ("your switch risk vs. last term").
- Lightweight backend for opt-in aggregate (anonymous) research data.
- Advisor mode with a summary view.
- Validated scoring model informed by collected responses.
