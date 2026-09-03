# Studio data shapes vs the API

The Next.js workspace types several list payloads as richer objects than Prisma actually returns. The studio then reads fields that are never present on GET, so cards look empty and the resume editor hydrates from a hardcoded template.

Sources: `src/types/resumes.ts`, `src/types/retrieval.ts`, `src/types/common.ts`, `src/hooks/useResumeDraft.ts`, `src/components/modules/resume/*`, `src/components/dashboard/kpi-grid.tsx`. Backend columns: `resume-tailor-api/prisma/schema.prisma`.

## Resume records have no `insight`

Ingest returns `{ record, insight }`. Every later read returns the Prisma `Resume` row:

| API column | Frontend type (`ResumeRecord`) |
| --- | --- |
| `extractedSummary` | not typed; UI reads `insight.summary` |
| `skills` | not typed; UI reads `insight.skills` |
| `experience` / `education` / `contact` (JSON) | not typed; UI reads `insight.experiences` etc. |
| — | `insight?: ResumeInsight` (never on GET/LIST) |
| — | `resumeText?: string` (raw text lives on the ingest **insight payload**, not the row) |

`GET /resumes` and `GET /resumes/:id` do not join insights or rename columns.

### Dashboard card

`ResumeInsightsCard` does `latest?.insight`. After a successful ingest + `invalidateQueries(["resumes"])`, `latest` exists but `insight` is undefined, so the card renders **no summary or skills** (the empty-state copy only runs when there is no row at all).

Map GET payloads before render, for example:

```ts
const insight = {
  summary: resume.extractedSummary,
  skills: resume.skills,
  experiences: resume.experience ?? [],
  education: resume.education ?? [],
  contact: resume.contact ?? {},
};
```

### Resume studio draft

`ResumeBuilder` seeds `useResumeDraft(resume?.insight)`. On `/resume`, `resume` is `listResumes()[0]` (newest only). Because `insight` is missing:

- The editor fills `DEFAULT_RESUME_TEMPLATE` from `src/lib/constants.ts` (canned summary, skills, highlights) instead of the stored resume.
- `useState` in `useResumeDraft` does not reset when `resume` later arrives or when ingest invalidates the query. Navigate away and back, or remount, to rebuild the draft.
- Generate/Improve still work: they send `resumeId` and the API enriches from the **database** via `buildSectionContext()`. The on-screen draft can disagree with what the model sees.

### Apply / PATCH pitfalls

| UI action | Persisted? |
| --- | --- |
| Apply summary / skills | Yes — PATCH uses the suggestion text only |
| Apply experiences | Yes — PATCH sends **the entire local `draft.experiences` array** with one role's achievements replaced. If the draft was never hydrated, this can overwrite stored experience with template/empty roles |
| Education, contact, headline, custom sections | **No** — local draft / export only. There are no generate/improve buttons for `education` or `contact` |
| Export PDF/DOCX | Browser-only (`src/lib/exporters.ts`); does not write the API |

Section generate context from the UI is `{ notes }` plus `experienceIndex` for roles. Zod on the API **strips** `resumeHighlights`, `projectHighlights`, `personaInsights`, and `additionalInsights` if a client sends them; the service fills those from `collectUserContext` after validation.

`:section` must be `summary | skills | experiences | education | contact` (400 otherwise). `content` from the model may be a string, array, or object; the builder flattens it to `string[]` before display.

## Tailored assets

| API (`TailoredAsset`) | Frontend (`TailoredAsset` / `EntityBase`) |
| --- | --- |
| `content String` | `content: string \| CoverLetterContent` |
| `createdAt` only | `updatedAt: string` required by `EntityBase` |
| `recommendations Json?` | optional; omitted in DB when the LLM output was not JSON |

`TailoredAssetsCard` calls `formatDate(asset.updatedAt)` → empty string. It shows three rows (title + `assetType`) and never the letter body.

The cover-letter workbench lists **global** `listProjects()` (no `mine=true`) and always posts `assetType: "cover_letter"`. See `resume-tailor-api/docs/retrieval-tailoring.md` for ownership and default project-fill behavior.

## Dashboard KPIs

`KpiGrid` counts `listProjects()` (unscoped), `listResumes()` (caller), and `listTailoredAssets()` (caller). **Coaching sessions is hardcoded to `1`** — there is no list-sessions API.

`ProjectList` / cover-letter project chips use the same unscoped `["projects"]` query, so the signed-in dashboard enumerates every indexed repo, not `mine=true`.

## Related codepaths

- `src/types/{resumes,retrieval,common}.ts`
- `src/hooks/useResumeDraft.ts` / `src/lib/constants.ts` (`DEFAULT_RESUME_TEMPLATE`)
- `src/components/modules/resume/{resume-builder,resume-insights-card,resume-ingest-form}.tsx`
- `src/components/modules/retrieval/{cover-letter-workbench,tailored-assets-card}.tsx`
- `src/components/dashboard/kpi-grid.tsx` / `src/components/modules/projects/project-list.tsx`
- `resume-tailor-api/src/modules/resumes/resume.service.ts` (`normalizeSectionContent`, `buildSectionContext`)
