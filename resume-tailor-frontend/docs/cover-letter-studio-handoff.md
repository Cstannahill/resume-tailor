# Cover letter studio handoff

`/cover-letter` stacks Job Intelligence under the tailor form. Analysis can pre-fill the letter, but the two APIs do not share a job-title field and the studio does not auto-generate after analysis.

Sources: `src/app/cover-letter/page.tsx`, `src/components/modules/intelligence/job-intel-workbench.tsx`, `src/components/modules/retrieval/cover-letter-workbench.tsx`, `src/services/intelligence.ts`, API `src/modules/intelligence/jobIntelligence.{controller,service}.ts`.

## What the JD analyzer sends

Studio POST body is only:

```json
{ "jobDescription": "...", "llmProvider": "ollama" }
```

The Job title input is **React state**. It is not in `JobIntelligencePayload` and Zod on `POST /intelligence/job` does not accept `jobTitle` or `userId`. The API prompt is `createJobDescriptionInsightsPrompt({ jobDescription })` — title never reaches the model.

The Analyze button enables whenever `jobDescription` is non-empty. The API still requires **50** characters (`z.string().min(50)`), so short pastes 400.

`userId` for resume matching is taken from the JWT in the controller, not the body.

## What gets copied into the letter form

On success, `handleIntelComplete` sets `intelContext`:

| Field | Source |
| --- | --- |
| `jobTitle` | local input (never analyzed) |
| `jobDescription` | local textarea |
| `resumeId` | **first** `result.matches.resumes[0].id`, or omitted |
| `projectIds` | **all** `result.matches.projects[].id` |

`CoverLetterWorkbench` then `setValue`s those fields. Project chips **merge** with any already selected IDs (union). It does not call tailor by itself.

Resume matching uses the caller's resumes vs required tech **names**. Project matching uses up to 25 newest **global** projects (`hasSome` on `Project.technologies`, case-sensitive language names). A match can therefore pre-select another user's repo ID.

## Tailor request from this page

The form always sends `assetType: "cover_letter"`. Zod on the API allows `resume | cover_letter | summary` and defaults to **`summary`** if omitted — this page does not omit it.

Client min for `jobDescription` is **100** characters; API min is **30**. `resumeId: ""` (the "Auto-select latest" option) is sent as an empty string; treat that as unset on the server (no owner check).

Generated `record.content` may be a JSON object or fenced JSON. `parseCoverLetterContent` unwraps `{ content, projectHighlights, resumeBullets, alignmentNotes }` for the textarea; leftover fence text is stripped first.

## Related codepaths

- `src/types/job-intelligence.ts` — payload has no `jobTitle`
- `../resume-tailor-api/src/routes/intelligence.routes.ts`
- `../resume-tailor-api/src/routes/retrieval.routes.ts`
- `docs/export-and-deliverables.md` — PDF/DOCX after generate
