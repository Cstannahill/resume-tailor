# Job intelligence

`POST /intelligence/job` asks an LLM to parse a job description, then matches required technologies against stored projects and the caller's resumes.

Source of truth: `src/modules/intelligence/jobIntelligence.service.ts`, `src/routes/intelligence.routes.ts`.

## Request

Auth required. `userId` is taken from the JWT. `jobDescription` minimum is **50** characters.

```json
{
  "jobDescription": "Full job description text...",
  "llmProvider": "google"
}
```

The cover-letter studio's job-title field is local UI state only — it is not sent to this endpoint.

## Pipeline

```text
LLM insights (maxOutputTokens 600)
        |
requiredTechnologies[].name  (unique, as returned)
        |
projects: newest 25, optional technologies hasSome those names (NOT owner-scoped)
resumes: caller only
        |
match if any tech/skill equals a required name (case-insensitive)
        |
coverage.covered / coverage.missing
```

Unparseable LLM JSON uses empty lists and `roleSummary: "Unable to parse job description. Provide more context."`

## Matching pitfall: languages vs libraries

Indexed `Project.technologies` are **file-extension languages** from heuristics (`TypeScript`, `JavaScript`, `Python`, …), not libraries (`React`, `GraphQL`). See `projectIndexing.service.ts` `analyzeSourceFiles`.

Job-description models usually emit library names. Those names are used two ways:

1. **Fetch filter** — Prisma `technologies: { hasSome: requiredTechNames }` is **case-sensitive exact** match on the `Project.technologies` string array. `"React"` does not select a project that stored `"TypeScript"`. `"react"` does not select `"React"`.
2. **Match** — after fetch, comparison lowercases both sides. A project that was not fetched cannot match.

Practical result: project matches are sparse unless the JD analysis happens to list the same language strings indexing stored.

Resume matches use `Resume.skills` (from ingest/LLM) against the same required names, owner-scoped, and are usually more useful.

Projects with **no** overlapping tech after fetch are dropped (`matchingTechnologies` empty → omitted). Coverage `missing` is required names that appeared on neither matched projects nor matched resumes.

## Caps and scoping

| Dataset | Scope | Cap |
| --- | --- | --- |
| Projects | Global (no `ownerId`) | 25 newest by `updatedAt` |
| Resumes | JWT user | all of that user |

Pass matched project ids into `POST /retrieval/tailor` if you need a cover letter grounded in those repos. If tailor is called without `projectIds`, it uses the three newest projects in the **whole** database.

## Related codepaths

- `src/modules/intelligence/jobIntelligence.{controller,service,types}.ts`
- `src/modules/projects/projectIndexing.service.ts` (how `technologies` is populated)
- `resume-tailor-frontend/src/components/modules/intelligence/job-intel-workbench.tsx`
- `resume-tailor-frontend/src/app/cover-letter/page.tsx`
