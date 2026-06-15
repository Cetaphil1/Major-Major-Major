# Routing And Page Flow

Fit Beyond Interest is a plain multi-page static app. Each route is an `.html`
file that loads global scripts, React components, and Babel Standalone in the
browser. There is no router, bundler, server-side redirect layer, or hash route
contract in the root app.

## Canonical Flow

The intended student path is:

```text
start.html -> index.html -> survey.html -> in-page report
```

- `start.html` collects name, college, and major in `app/prelanding.jsx`.
- `index.html` renders the personalized research center.
- `survey.html` runs the survey state machine in `app/fit-app.jsx`.
- The final report is a React phase inside `survey.html`, not a separate page.

`research.html` currently renders the same research center as `index.html`.
Treat `index.html` as the canonical post-context research URL until the product
chooses a different home/research split.

## Page Matrix

| Page | Runtime role | Main scripts | Gate behavior |
| --- | --- | --- | --- |
| `start.html` | Context entry | `app/user-context.js`, `app/prelanding.jsx` | No gate |
| `index.html` | Canonical research center | `app/user-context.js`, `app/research-data.js`, `app/research.jsx` | Redirects to `start.html` when `preLandingComplete` is false |
| `research.html` | Duplicate research center | `app/user-context.js`, `app/research-data.js`, `app/research.jsx` | No pre-landing gate today |
| `survey.html` | Context review, quiz, analyzing, report | `app/fit-app.jsx`, `app/screens-quiz.jsx`, `app/screens-report.jsx` | `app/fit-app.jsx` redirects to `start.html` when `preLandingComplete` is false |
| `Landing (marketing backup).html` | Backup marketing page | `animations.jsx`, inline page script | Has its own pre-landing check |
| `about.html`, `dimensions.html`, `models.html`, `model-iceberg.html` | Explainers and design pages | Mostly page-local scripts/styles | No shared route gate |
| `Survey (dark).html` | Legacy dark survey variant | `app-dark/*` | Separate from the light flow |

## Hard-Coded Navigation

Change routing in all of these places when the canonical post-context URL
changes:

- `app/prelanding.jsx`: after context confirmation, saves
  `preLandingComplete: true` and navigates to `index.html`.
- `app/fit-app.jsx`: `toLanding()` sends survey users back to `index.html`;
  the mount effect redirects incomplete visitors to `start.html`.
- `index.html` and `research.html`: top nav links point to `start.html`,
  `survey.html`, and `index.html`.
- `app/screens-report.jsx`: `ReportExtras` links to `research.html`, which is
  inconsistent with the current canonical `index.html` research route.
- `Start flow (editable).html`: standalone mirror that may still link to
  `index.html`, but it is not wired to shared modules.

## Persistence Contract

Routing depends on `window.UserContext`, which stores `fbi-user-context-v1` in
`localStorage`:

```js
{
  displayName: string | null,
  selectedCollege: { name, city, state, type, level, id, isManual } | null,
  selectedMajor: { name, category, cipCode, keywords, relatedMajors, isManual } | null,
  contextConfirmed: boolean,
  preLandingComplete: boolean
}
```

The survey controller also stores `fbi-flow-v1` with `{ phase, ctx, sectionIdx,
answers }`. The pre-landing context remains the source of truth for name,
college, and major; `app/fit-app.jsx` overlays it onto saved survey state.

## External Links

Research links are direct anchors with:

```html
<a href="https://..." target="_blank" rel="noopener noreferrer">
```

`index.html` and `research.html` add a delegated `window.open` fallback for
external anchors. Do not convert these links into internal routes, iframes, or
`window.location.href` redirects. The design preview may show
`X-Frame-Options` failures for Google, YouTube, Reddit, and similar sites; test
real link behavior in a local or deployed browser tab.

## Routing Change Checklist

1. Pick one canonical research URL before editing behavior.
2. Update `app/prelanding.jsx`, `app/fit-app.jsx`, `app/screens-report.jsx`,
   `index.html`, and `research.html` together.
3. Preserve the first-time visitor gate for the canonical post-context page.
4. Keep demo fallback data visibly labeled `Preview` if an ungated route remains.
5. Test with a fresh browser profile or cleared `localStorage`.
6. Test with an existing `fbi-user-context-v1` value to confirm refresh and back
   navigation still work.
