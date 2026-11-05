# Render shape assumptions

`JobIntelWorkbench` and `CoverLetterWorkbench` render model fields with array methods. A 200 response whose JSON uses a string where the prompt asked for an array throws during render. There is no error boundary on these cards.

Sources: `src/components/modules/intelligence/job-intel-workbench.tsx`, `src/components/modules/retrieval/cover-letter-workbench.tsx`, `src/lib/exporters.ts`.

## Job intelligence

`POST /intelligence/job` returns the parsed object when `requiredTechnologies` is an array, including an array of strings. The workbench then renders it directly.

| Field | What the card does |
| --- | --- |
| `senioritySignals` missing or `[]` | No badges |
| `senioritySignals` as a string | `?.map` still runs (a string is not nullish) and throws. The results column unmounts. |
| `requiredTechnologies` as `[{ name, importance }]` | One row per object |
| `requiredTechnologies` as `["React"]` | Does not throw. `tech.name` is `undefined`, so the row is blank and every row's React key is `undefined`. |
| `requiredTechnologies` as a non-empty string | `.length > 0` is true, then `.map` throws |

`culturalNotes`, `responsibilityThemes`, and `riskAlerts` are still not rendered. `jobTitle` is still only the local "Target role" line; it is not sent to the API.

The Analyze button is disabled only when `jobDescription` is empty. A description shorter than the API minimum of 50 characters is sent and comes back as **400** `Validation failed`.

## Cover letter highlights

`parseCoverLetterContent` copies `projectHighlights`, `resumeBullets`, and `alignmentNotes` from the parsed `record.content` with `??`. A string is not nullish, so it replaces the recommendation arrays.

`InsightCard` calls `items.map`. A string `projectHighlights` or `resumeBullets` passes the `.length` check and then throws in the card. An object `alignmentNotes` is rendered as a React child and throws (`Objects are not valid as a React child`).

PDF and DOCX build `sections[].lines` from those same arrays and call `lines.forEach`. A string list throws inside `exportToPdf` / `exportToDocx`. Those buttons have no `catch`, so the failure is an unhandled rejection and the page shows no toast.

An array of strings follows the intended path: the card lists them, and export writes one paragraph per string.

## Related codepaths

- `src/components/modules/intelligence/job-intel-workbench.tsx`
- `src/components/modules/retrieval/cover-letter-workbench.tsx` (`parseCoverLetterContent`, `InsightCard`)
- `src/lib/exporters.ts`
- `resume-tailor-api/src/modules/intelligence/jobIntelligence.service.ts`
- `resume-tailor-api/src/modules/resumes/resume.service.ts` (`normalizeSectionContent`)
