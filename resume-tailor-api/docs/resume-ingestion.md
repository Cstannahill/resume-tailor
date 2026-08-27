# Resume ingestion

`POST /resumes/ingest` turns pasted plaintext into a `Resume` row, technology links, and two insights. The API does not parse PDFs.

Source of truth: `src/modules/resumes/resume.service.ts`, `src/routes/resume.routes.ts`.

## Request

Auth required. `userId` is taken from the JWT (`handleResumeExtraction` overwrites any body value).

```json
{
  "resumeText": "Plaintext or OCR output (min 50 characters)...",
  "sourceName": "May 2024 resume.pdf",
  "llmProvider": "google"
}
```

Response `201`: `{ record, insight }`.

The UI form requires **200** characters and reads uploads with `file.text()`. A PDF is not OCR'd — binary garbage usually fails client validation. Paste plaintext instead.

## Pipeline

```text
regex seed from resumeText
        |
LLM enrich (maxOutputTokens 600)
        |
merge (LLM fields win when non-empty)
        |
create Resume + syncResumeTechnologies(skills)
        |
write resume-ingest raw + derived insights
```

### Regex seed (`seedInsightFromText`)

| Field | Heuristic |
| --- | --- |
| `summary` | First 3 lines, joined, truncated to 280 characters |
| `skills` | Lines matching `/skills?/i`, split on `,`, `•`, `\|`, `-`; unique, cap 25 |
| `experiences` | Blank-line chunks matching `engineer\|developer\|manager\|lead`; up to 4. Line 0 = company, line 1 = role, remaining bullets = achievements (cap 3) |
| `education` | Always `[]` in the seed |
| `contact` | First email regex match; first phone-like match |

These heuristics miss many real resumes. The LLM pass is expected to fill structured JSON; if it returns nothing useful, the seed is stored as-is.

### Merge

`mergeInsights` keeps seed values unless the LLM provided a non-empty replacement. Contact objects are shallow-merged (seed then LLM).

Unparseable LLM output becomes `{}` via `parseJsonResponse`, so the seed wins.

### Persistence

- `Resume.extractedSummary` / `skills` / `experience` / `education` / `contact`
- `ResumeTechnology` rows for each skill name (`ensureTechnologies` is **case-sensitive**; `"React"` and `"react"` are different `Technology` rows)
- Insights:
  - `source: resume-ingest`, `layer: raw` — `{ resumeText, seed }`
  - `source: resume-ingest`, `layer: derived` — combined insight

Those sources do **not** contain `conversation`, so they land in user-context `additionalInsights`.

## Section generate / improve / patch

Documented in `frontendv2.md`. Operational notes:

| `:section` | PATCH storage |
| --- | --- |
| `summary` | `extractedSummary` (string; non-strings are `JSON.stringify`'d) |
| `skills` | `string[]`; a string is split on newlines/commas |
| `experiences` | JSON array of `{ company, role, achievements[] }` |
| `education` | JSON array, or `{ summary }` if a string was sent |
| `contact` | JSON object, or `{ raw: String(content) }` |

Generate/improve require ownership (`404` missing, `403` other user). Suggestions are **not** persisted until PATCH. Context enrichment is in `user-context.md` if that runbook is on the branch; otherwise see `buildSectionContext()` in `resume.service.ts`.

## Reads

- `GET /resumes` — caller's resumes, `createdAt` desc
- `GET /resumes/:resumeId` — owner only (`404` / `403`)

The resume studio always edits `listResumes()[0]` (newest), not a selected id.

## Related codepaths

- `src/modules/resumes/resume.{controller,service,types}.ts`
- `src/repositories/resumes/resume.repository.ts`
- `src/repositories/technologies/technology.repository.ts`
- `resume-tailor-frontend/src/components/modules/resume/resume-ingest-form.tsx`
