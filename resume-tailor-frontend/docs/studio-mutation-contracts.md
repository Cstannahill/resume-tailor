# Studio mutation contracts

UI write/read mismatches that are not the resume GET `insight` shape, settings field rename, or auth `name`/`displayName` contract.

Sources: `src/components/modules/profile/developer-report-card.tsx`, `src/services/profile.ts`, `src/lib/api-client.ts`, `src/components/modules/retrieval/cover-letter-workbench.tsx`, `src/components/modules/projects/project-indexer.tsx`, `src/components/modules/resume/{resume-builder,resume-ingest-form}.tsx`, `src/hooks/useResumeDraft.ts`.

## Developer report double-unwraps `{ data }`

`apiRequest` already returns `json.data`. `DeveloperReportCard` then does `setReport(response.data)`.

The API body is `{ data: { developerOverview, coreStrengths, ... } }`, so after unwrap `response` **is** the report. `response.data` is `undefined`. Generate can 200 and the card stays on the empty-state copy. `src/types/profile.ts` types `DeveloperReportResponse` as `{ data: DeveloperReportData }`, which matches the wire envelope, not what `apiRequest` returns.

Use `setReport(response)` (typed as `DeveloperReportData`) after a successful mutate.

## Cover letter “Auto-select latest” sends `resumeId: ""`

The resume `<select>` default is `value=""`. React Hook Form submits that empty string. Retrieval `buildContext` only falls back to the caller’s newest resume when `resumeId` is **omitted** (`!== undefined`). `""` is defined, `getResumeById("")` is null, and the tailor prompt gets **no resume**.

Leave the field unset, or map `""` to `undefined` before POST.

PDF/DOCX export is not letter-only: it appends Project Highlights, Resume Bullets, and Alignment Notes when those arrays/strings are present.

## Cache invalidation after writes

React Query `staleTime` is 60s (`app-providers.tsx`). These mutations do **not** invalidate the lists they change:

| Mutation | Updates | Missing invalidate |
| --- | --- | --- |
| Project index success | DB project + artifacts | `["projects"]` (dashboard list + KPI) |
| Cover-letter tailor success | `TailoredAsset` row | `["tailored-assets"]` |
| Resume ingest | new `Resume` | **does** invalidate `["resumes"]` |

Ingest still drops the POST `{ record, insight }` payload and refetches the list, which has no `insight`. `useResumeDraft` seeds `useState` once and does not reset when `resume.id` / ingest completes, so the editor can keep `DEFAULT_RESUME_TEMPLATE` until remount.

## Manual resume edits never PATCH

Textareas for summary, skills, company/role only call `updateDraft`. `updateResumeSection` runs solely from **Apply** on an AI suggestion (summary / skills / experiences). Education, contact, headline, and custom sections stay local even then. Generate/improve omit `llmProvider` (ingest/index/tailor can send one).

## Related codepaths

- `src/components/modules/profile/developer-report-card.tsx` / `src/services/profile.ts`
- `src/components/modules/retrieval/cover-letter-workbench.tsx`
- `src/components/modules/projects/project-indexer.tsx`
- `src/components/modules/resume/resume-builder.tsx` / `resume-ingest-form.tsx`
- `src/hooks/useResumeDraft.ts`
- `resume-tailor-api/src/modules/retrieval/retrieval.service.ts` (`buildContext`)
