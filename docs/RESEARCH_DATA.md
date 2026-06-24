# Research Data Layer

The research center is built from local JSON files, a small global data layer,
and direct outbound links. It does not scrape external sites and does not send
student data to a backend.

## Runtime Ownership

| File | Responsibility |
| --- | --- |
| `app/research-data.js` | Loads local JSON, builds link groups, resolves college profiles, calls College Scorecard, exposes `window.Research` |
| `app/research.jsx` | Renders the research center UI and status badges |
| `index.html` | Canonical research page shell with pre-landing gate |
| `research.html` | Duplicate research page shell without the gate |
| `app/screens-report.jsx` | Embeds a "research center" CTA from the final report |

Load order matters: `app/research-data.js` must run before
`app/research.jsx`, and `app/user-context.js` must run before page shells read
saved college and major context.

## Data Sources

| File | Used for | Status contract |
| --- | --- | --- |
| `colleges.json` | Search/autocomplete records and college id lookup | Loaded local data |
| `majors.json` | Search/autocomplete records, CIP codes, category fallback for related majors | Loaded local data |
| `researchSources.json` | Link templates for official tools and public searches | Per-link status such as `Official source` or `Research link` |
| `collegeProfiles.json` | Inline demo school snapshots for selected schools | Source labels embedded per profile |
| `collegeMajors.json` | Hand-curated similar-major comparison lists | `Estimated` |
| `nearbyColleges.json` | Hand-picked regional comparison cards for demo schools | `Preview`; not distance-calculated |
| `app/college-snapshots.js` | Pre-landing preview snapshots | Dataset-specific source notes in file header |

The survey also defines smaller `COLLEGES` and `MAJORS` arrays in
`app/data.jsx`. Those are survey-context options and `SWITCH_MAP` companions,
not the full research/autocomplete datasets.

## `window.Research` API

`app/research-data.js` exports a plain global object:

| Method | Returns | Notes |
| --- | --- | --- |
| `load()` | `Promise<{ sources, similar, nearby, profiles, colleges }>` | Fetches local JSON once and caches it in memory |
| `contextFor(collegeName, majorName)` | Research context object | Resolves college id, profile, domain, and homepage |
| `collegeRecordFor(name)` | College record or `null` | Matches exact normalized name or alias |
| `profileFor(collegeId)` | Demo profile or `null` | Reads `collegeProfiles.json` after `load()` |
| `nearbyFor(collegeId)` | `{ list, fallback }` | Reads `nearbyColleges.json` after `load()` |
| `similarMajorsFor(majorName)` | `{ list, status, disclaimer, source }` | Prefers curated map, then falls back to same `majors.json` category |
| `buildCategories(ctx)` | Render-ready link categories | Expands every category in `researchSources.json` |
| `buildCategory(id, ctx)` | One category or `null` | Convenience wrapper over `buildCategories()` |
| `buildOne(entry, ctx)` | One render-ready link | Expands URL and label templates |
| `scorecardFor(name)` | `Promise` of live stats or `{ error }` | Uses College Scorecard API and caches successful matches in `localStorage` |

Call `load()` before methods that depend on local JSON. `ResearchCenter` already
does this internally before calling `contextFor()`, `buildCategories()`,
`similarMajorsFor()`, and `nearbyFor()`.

## Link Template Rules

`researchSources.json` supports these link types:

- `direct`: interpolates `{c}` and `{m}` into a URL with URL-encoded college and
  major names.
- `homepage`: uses a verified profile homepage when available; otherwise builds
  a public search URL.
- `scoped`: searches inside a known college domain with `site:{domain}` when a
  profile domain exists; otherwise uses the broad query.
- `search`: prefixes the filled query with a configured engine such as Google,
  YouTube, Maps, or Reddit.

Text templates use `{college}`, `{major}`, and `{domain}`. Direct URL templates
use `{c}` and `{m}`.

## Status Labels

`app/research.jsx` maps status labels through `DataStatusBadge`. Preserve these
meanings when adding data:

| Status | Meaning |
| --- | --- |
| `Official source` | Verified official or government source |
| `Loaded` | Loaded local profile metadata, not necessarily a current official stat |
| `Research link` | A generated public search or external tool link |
| `Preview` | Placeholder/demo comparison data |
| `Estimated` | Hand-curated or category-derived estimate |
| `Needs source` | Displayed item has no verified source yet |
| `Coming later` | Temporarily unavailable or planned data path |

Never upgrade `Preview`, `Estimated`, or `Needs source` copy to look official
without changing the underlying source.

## College Scorecard Integration

`scorecardFor(name)` calls:

```text
https://api.data.gov/ed/collegescorecard/v1/schools
```

It requests school name, URL, enrollment, admissions, tuition, net price,
completion, and earnings fields. Matching is name-based with a few shortened
query attempts. Successful matches are cached in `localStorage` with keys like
`fbi-sc-university-name` for roughly 30 days.

Current constraints:

- The API key is `DEMO_KEY` in `app/research-data.js`.
- A production deployment should replace it with a free key from
  `https://api.data.gov/signup/`.
- 429 responses are treated as rate limiting and surfaced to the UI as
  `Coming later`.
- Failed or rate-limited responses are not cached, so temporary API failures do
  not poison future lookups.
- School-wide earnings are labeled as school-wide; major-specific earnings are
  linked out to College Scorecard Fields of Study rather than stored locally.

## Adding Research Data

1. Prefer an official source or direct external tool before adding a copied
   statistic.
2. Add or update the JSON file that owns the data, not page-local JSX.
3. Include a status/disclaimer when data is estimated, preview-only, or derived.
4. Verify `ResearchCenter` renders the college with and without a saved
   `UserContext`.
5. Test outbound links in a real browser tab; the design preview is not reliable
   for external-link behavior.
