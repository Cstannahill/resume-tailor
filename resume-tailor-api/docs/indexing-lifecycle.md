# Indexing lifecycle and mutation gaps

Behaviors that indexing/resume write paths actually do, beyond file-cap, clone, and upsert-by-URL notes in earlier drafts.

Sources: `src/modules/projects/projectIndexing.service.ts`, `src/routes/project.routes.ts`, `src/modules/resumes/resume.service.ts`, `src/repositories/resumes/resume.repository.ts`, `src/repositories/insights/insight.repository.ts`, `src/prompts/basePrompts.ts` (`createProjectSummaryPrompt`).

## Local `kind: local` reads the API host filesystem

`POST /projects/index` with `{ "source": { "kind": "local", "path": "..." } }` stats that path on **the Node process** and indexes it. There is no allowlist, chroot, or `path.resolve` jail. The path is stored as `Project.localPath` and returned on `GET /projects`.

Use this only for single-user local dev. In any shared host it can read whatever the API user can read.

## `tags` are accepted and discarded

The index Zod schema allows `tags: string[]`. `indexProject` never reads `request.tags`. Prisma `Project` has no tags column. `docs/frontend.md` examples that send `"tags": ["frontend", "ai"]` are silent no-ops. The studio still splits a tags field and sends it.

## Project summary is unparsed LLM text

`createProjectSummaryPrompt` asks for JSON keys `executiveSummary`, `architecture`, `metrics`, `risks`, `nextSteps`. `summarizeProject` returns `response.content` with **no** `parseJsonResponse`. That string is stored on `project.summary` and later injected into tailor / user-context prompts. Re-index **replaces** artifacts and the project row, but see insights below.

## Re-index appends insights; ingest always inserts resumes

| Write | Project / resume row | Insights |
| --- | --- | --- |
| `POST /projects/index` same `repoUrl` / `localPath` | Upsert (replace summary, artifacts, tech links) | **Two new** `Insight` rows every time (`project-index` + `project-summary`). No delete/dedup. |
| `POST /resumes/ingest` | Always `prisma.resume.create` | Two new insights per ingest |

There is no resume upsert by `sourceName` or hash. List order is `createdAt desc`, so omitted `resumeId` on tailor uses the **newest** ingest.

`PATCH /resumes/:id/sections/skills` updates the `skills` column only. `syncResumeTechnologies` runs on ingest, not on PATCH, so knowledge-graph `technology_to_resume` edges and `ResumeTechnology` stay stale.

## No delete APIs for core entities

The only `DELETE` route is `/settings/provider-keys/:provider`. Resumes, projects, conversations, tailored assets, and insights have no HTTP delete (or list-insights) surface. Insight `projectId` / `resumeId` / session ids are loose strings (see `conversation-client-contract.md`). Cleanup is Prisma / SQL.

## Related codepaths

- `src/modules/projects/projectIndexing.service.ts` (`resolveSourceRoot`, `summarizeProject`, `indexProject`)
- `src/routes/project.routes.ts` (`tags` on `projectIndexSchema`)
- `src/modules/resumes/resume.service.ts` (`extractResumeInsights`, `normalizeSectionContent`)
- `src/repositories/resumes/resume.repository.ts` (`createResumeRecord`, `listResumes`)
- `src/routes/*.routes.ts` (delete coverage)
