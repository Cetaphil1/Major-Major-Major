# Survey Scoring And Report Generation

The survey and report are computed entirely in the browser by `app/fit-app.jsx`
from question definitions in `app/data.jsx`. There is no backend scoring
service, model call, or persisted server record.

## Inputs

`app/data.jsx` defines eight dimensions:

| Key | Display name | Section |
| --- | --- | --- |
| `interest` | Interest fit | 1 |
| `confidence` | Skill confidence | 2 |
| `workload` | Workload tolerance | 3 |
| `motivation` | Motivation | 4 |
| `career` | Career clarity | 5 |
| `school` | School fit | 6 |
| `belonging` | Belonging | 7 |
| `burnout` | Burnout risk | 8 |

Each section has three 1-to-5 Likert questions. Some questions set
`reverse: true`, meaning a high raw answer is unhealthy and must be flipped.

Student identity and context come from `window.UserContext`
(`fbi-user-context-v1`). Survey progress and answers are stored locally in
`fbi-flow-v1`.

## Dimension Score

`dimScore(section, answers)` maps each answered section to a 0-to-100 score:

```js
normalizedValue = question.reverse ? 6 - rawAnswer : rawAnswer
mean = average(normalizedValue)
dimensionScore = Math.round(((mean - 1) / 4) * 100)
```

Higher is healthier for every dimension. This includes `burnout`: a high
`burnout` score means stronger burnout resilience, while low `burnout` drives
higher displayed burnout risk.

If a section has no answer, `buildReport()` defaults that dimension to `55`.

## Overall Fit

The overall major fit score is a weighted average:

```js
overall = Math.round(
  (
    interest * 1.3 +
    confidence +
    workload * 1.1 +
    motivation +
    career +
    school +
    belonging +
    burnout * 1.2
  ) / 8.6
)
```

Labels:

| Score | Label |
| --- | --- |
| `>= 78` | `Strong fit` |
| `>= 60` | `Moderate fit` |
| `>= 45` | `Fragile fit` |
| `< 45` | `Poor fit` |

## Switching Risk

Switching risk is driven by operational, belonging, motivation, school, and
career signals. Interest is not directly in the formula because the report tries
to distinguish "I like the subject but the conditions are not working" from "I
do not like the subject."

```js
switchPct = Math.round(
  100 -
    (
      workload * 0.9 +
      burnout * 1.0 +
      belonging * 0.8 +
      motivation * 0.7 +
      school * 0.6 +
      career * 0.5
    ) / 4.5
)

if (intent === "switch") switchPct += 8
if (intent === "exploring") switchPct += 3
switchPct = clamp(switchPct, 4, 96)
```

Risk labels come from `riskLevel(pct)`:

| Percent | Level | Tone |
| --- | --- | --- |
| `>= 62` | `High` | `risk` |
| `>= 46` | `Elevated` | `warn` |
| `>= 30` | `Moderate` | `warn` |
| `< 30` | `Low` | `good` |

## Burnout Risk

Displayed burnout risk inverts the healthy burnout-resilience dimension:

```js
burnoutPct = clamp(100 - burnoutScore, 4, 96)
burnoutRisk = riskLevel(burnoutPct)
```

## Narrative Selection

`buildReport(ctx, answers)` ranks all dimensions, stores the top three as
`strongest`, and stores the bottom three as `weakest`.

The lead verdict uses these rules:

- `overall >= 78`: strong fit and built to last.
- `interest >= 62` and `workload <= 48` or `burnout <= 48`: real interest, but
  the term or workload is draining.
- `interest < 50`: the subject pull itself is fading.
- Otherwise: mixed picture, potentially stay-able with changes.

The diagnosis copy is selected from the weakest dimensions in this order:

1. `interest`
2. `workload` or `burnout`
3. `school`
4. `career`
5. `belonging`
6. fallback cluster of smaller strains

Next steps are added when these dimensions are `<= 55`: `burnout`, `workload`,
`belonging`, and `career`. A four-week check-in step is always appended.

## Better-Fit Major Directions

`SWITCH_MAP` in `app/fit-app.jsx` maps selected majors to adjacent directions.
When the current major is not in the map, the report falls back to generic
adjacent-field options.

The displayed strings such as `94% aligned` are static illustrative labels from
`betterFitFor()`. They are not computed from the user's answers and should not
be described as official match probabilities.

The separate research center's "Similar majors" section uses
`collegeMajors.json` and category fallback logic in `app/research-data.js`.
That list is for academic comparison, not the same as report recommendations.

## UI Interpretation

`app/screens-report.jsx` renders:

- Overall score and label.
- Switching risk and burnout risk tiles.
- Strongest and weakest dimension lists.
- Diagnosis, school environment, next steps, stay/switch signs, and questions.
- A research-center CTA and placeholder coffee links.

The report footer says the result is saved locally and is not a clinical
assessment. Preserve that constraint when changing report copy or export flows.

## Change Checklist

1. Update `app/data.jsx` when adding dimensions, sections, questions, scales, or
   reverse-scored items.
2. Update `app/fit-app.jsx` when changing formulas, weights, thresholds, or
   narrative selection.
3. Update `app/screens-report.jsx` if report object shape changes.
4. Update this document whenever formulas or thresholds change.
5. Test complete and partial answer sets. Partial sections default to `55` only
   when no answers exist for that dimension.
