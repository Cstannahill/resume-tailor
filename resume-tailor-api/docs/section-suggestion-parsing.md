# Resume section suggestion parsing

`POST /resumes/:id/sections/:section/generate` and `.../improve` both send the model string through `parseSuggestion`. A value that `parseJsonResponse` accepts is not the success branch.

Sources: `src/modules/resumes/resume.service.ts` (`parseSuggestion`), `src/modules/resumes/resume.controller.ts` (`getSectionFromParams`).

## Success branch

`parseJsonResponse` runs first. Success requires `parsed.content` to be truthy. The response `section` is the URL parameter (`summary`, `skills`, `experiences`, `education`, `contact`). A `section` field from the model is ignored. `rationale` is copied only when it is also truthy.

| `parsed.content` | Branch |
| --- | --- |
| non-empty string | success |
| non-empty array, or `[]` | success (`[]` is truthy) |
| `""`, missing, `null` | raw-text branch |

## Raw-text branch

`content` is the original payload string, not the slice `parseJsonResponse` may have parsed.

| Model output | Returned `content` | Returned `rationale` |
| --- | --- | --- |
| `{ "content": "", "rationale": "too thin" }` | that JSON string | `Failed to parse suggestion; returning raw text.` The model rationale is dropped. `JSON.parse` of the payload succeeds, so the catch does not run. |
| `{ "rationale": "see above" }` | that JSON string | same default sentence |
| prose that is not JSON | the prose | the `JSON.parse` error message (`Unexpected token …`) |
| `{ "content": "Shipped the pipeline" }` | `Shipped the pipeline` | model `rationale` when present |

The studio then runs that `content` through `normalizeSuggestionContent`. A raw JSON string is split into lines and shown as the suggestion. See `resume-tailor-frontend/docs/suggestion-lines-and-chrome.md`.

Job intel, the developer report, and tailor use different “any parsed value” rules. This helper is only generate and improve.

## Related codepaths

- `src/utils/json.ts` (`parseJsonResponse`)
- `src/prompts/basePrompts.ts` (`createResumeSectionGeneratePrompt`, `createResumeSectionImprovePrompt`)
- `resume-tailor-frontend/src/components/modules/resume/resume-builder.tsx`
