# Retrieval / job-material tailoring

`POST /retrieval/tailor` generates a stored `TailoredAsset` (cover letter, resume pack, or summary) from a job description plus optional resume and project context. `GET /retrieval/tailored` lists the caller's assets.

Sources: `src/modules/retrieval/retrieval.{service,controller,types}.ts`, `src/routes/retrieval.routes.ts`, `src/prompts/basePrompts.ts` (`createJobTailoringPrompt`), `src/repositories/assets/tailoredAsset.repository.ts`.

## Request

Auth required. `handleTailorJobMaterials` sets `userId` from the JWT and **overwrites** any body `userId`.

```http
POST /retrieval/tailor
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobTitle": "Senior React Engineer",
  "jobDescription": "At least 30 characters of JD text...",
  "resumeId": "optional-resume-uuid",
  "projectIds": ["optional-project-uuid"],
  "assetType": "cover_letter",
  "llmProvider": "ollama"
}
```

| Field | Constraint |
| --- | --- |
| `jobTitle` | Required, min 1 character |
| `jobDescription` | Required, min **30** characters (cover-letter UI requires **100**) |
| `assetType` | `resume` \| `cover_letter` \| `summary`. Omitted → stored and prompted as **`summary`** |
| `llmProvider` | Optional; otherwise `DEFAULT_LLM_PROVIDER` |

Response `201`: `{ record, recommendations }`.

`GET /retrieval/tailored` returns the caller's rows, `createdAt` desc. There is no get-by-id, patch, or delete route.

## Pipeline

```text
buildContext(resumeId / newest resume, projectIds / 3 newest projects)
        |
createJobTailoringPrompt (summary+skills, project name+summary only)
        |
adapter.generate (maxOutputTokens 600)
        |
parseJsonResponse → content + recommendations
        |
always prisma.tailoredAsset.create
```

### Resume selection

| Body | Behavior |
| --- | --- |
| `resumeId` set | `getResumeById(resumeId)` — **no owner check** |
| `resumeId` omitted | Newest resume for the JWT user (`listResumes({ userId })[0]`) |
| Missing / unknown id | `resume` is `null`; the prompt says `No resume available.` |

A caller can therefore ground a letter in **another user's resume** if they know the UUID. The stored `TailoredAsset.userId` is still the caller.

Only `extractedSummary` and `skills` go into the prompt. Experience, education, contact, and ingest insights are ignored here.

### Project selection

| Body | Behavior |
| --- | --- |
| `projectIds` non-empty | `getProjectById` per id; missing ids are dropped; **no owner check** |
| `projectIds` omitted / empty | `listProjects({ limit: 3 })` — three newest projects **in the whole database** |

The prompt receives `{ name, summary }` only. Heuristics, artifacts, and the `technologies` array are not included.

`TailoredAsset.projectIds` stores whatever survived lookup (not a Prisma relation).

### Prompt vs `assetType`

The model always returns the same JSON shape:

```json
{
  "content": "string",
  "projectHighlights": ["..."],
  "resumeBullets": ["..."],
  "alignmentNotes": "string"
}
```

`assetType` is interpolated as `Asset Type Requested: …` and stored on the row. There is no separate prompt per type. The studio only ever sends `cover_letter`.

## Persistence and parse fallbacks

A row is **always** inserted, even when JSON parse fails:

- Parsed: `content` from JSON; `recommendations` = `{ projectHighlights, resumeBullets, alignmentNotes }`
- Unparsed: `content` is the raw model string; `recommendations` in the **HTTP response** become empty arrays plus `alignmentNotes: "LLM returned unstructured response."` — and `recommendations` is **omitted** from the Prisma create payload (`createTailoredAsset` only sets the column when the parsed object exists)

`TailoredAsset.content` is a `String`. The UI type allows `string | { content, projectHighlights, … }`; the API does not store an object.

There is **no `updatedAt`** on `TailoredAsset` (only `createdAt`). Dashboard code that reads `asset.updatedAt` renders an empty date (`formatDate` treats missing as `""`).

## Studio behavior

`CoverLetterWorkbench` (`/cover-letter`):

1. Lists **all** projects via `listProjects()` (no `mine=true`).
2. Lists the caller's resumes; empty `resumeId` means "auto-select latest".
3. Always posts `assetType: "cover_letter"`.
4. Re-parses `record.content` client-side (`parseCoverLetterContent`) in case the model wrapped JSON in fences that the API already stored as text.
5. Exports PDF/DOCX in the browser. Editing the textarea does **not** PATCH the stored asset.

Job intel on the same page copies the first matched resume id and all matched project ids into the form. The job-title field is local-only until that copy.

There is no UI that posts `assetType: "resume"` or `"summary"`. The dashboard `TailoredAssetsCard` shows the three newest titles/types only.

## Related codepaths

- `src/modules/retrieval/retrieval.{service,controller,types}.ts`
- `src/routes/retrieval.routes.ts`
- `src/prompts/basePrompts.ts` (`createJobTailoringPrompt`)
- `src/repositories/assets/tailoredAsset.repository.ts`
- `resume-tailor-frontend/src/components/modules/retrieval/{cover-letter-workbench,tailored-assets-card}.tsx`
- `resume-tailor-frontend/src/app/cover-letter/page.tsx`
