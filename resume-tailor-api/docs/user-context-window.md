# User context window

Section generation, section improvement, and the developer report do not send the stored resume or project rows to the model. They send a snapshot from `collectUserContext`.

Sources: `src/modules/profile/userContext.service.ts`, `src/modules/resumes/resume.service.ts` (`buildSectionContext`), `src/modules/profile/profile.service.ts`, `src/prompts/basePrompts.ts`. Resume and project ordering: `src/repositories/resumes/resume.repository.ts`, `src/repositories/projects/project.repository.ts`, `src/repositories/insights/insight.repository.ts`.

`POST /retrieval/tailor` and `POST /intelligence/job` do not call this helper.

## Who is included

| Call | Resume used | Projects and insights |
| --- | --- | --- |
| `POST /resumes/:id/sections/:section/generate` and `/improve` | The resume in the URL, after the owner check | That resume's `userId` |
| `POST /profiles/developer-report` | Newest resume for the caller (`createdAt` descending, first row) | The caller's user id |

Projects are that owner's rows only. A project with a null `ownerId` is left out. Insights are every `Insight` for that user. `resumeId` and `projectId` on the insight row are not filters.

Editing a resume updates `updatedAt` and does not change which row the developer report picks. The report stays on the newest `createdAt`.

## What is copied from the resume

| Column | In the snapshot |
| --- | --- |
| `extractedSummary` | Full string, when present |
| `skills` | The whole array |
| `experience` | Up to 3 lines, in stored array order |
| `education` | Not read |
| `contact` | Not read |

An experience element counts only when it has a string `role`, a string `company`, or at least one string achievement. Other elements are skipped and do not use up one of the three lines. Each kept line uses at most two achievement strings:

```text
Staff Engineer @ Acme Highlights: Shipped X; Cut latency
```

Missing pieces are omitted. Achievements with no role or company become `Highlights: Shipped X; Cut latency`. There is no date sort. The first three qualifying objects win, which is the start of the array, not the end.

## Projects

`listProjects({ ownerId, limit: 3 })` orders by `updatedAt` descending. Re-indexing a project moves it into this window. Each line is:

```text
<name>: <summary or description or "No summary available yet."> | Tech: <up to 6 technologies> | Highlights: <up to 2 highlights>
```

`summary` is used when it is a non-empty string. The technology names are the `Project.technologies` array (language labels from indexing), not library names from the job description.

## Insights

Rows are loaded with `createdAt` descending, then split:

| Bucket | Rule | Kept |
| --- | --- | --- |
| Persona | `source` lowercased includes `conversation` | 4 |
| Additional | every other source | 4 |

`conversation-response` and `conversation-evaluator` both land in the persona bucket. `resume-ingest`, `project-index`, and `project-summary` land in the other. The two buckets are separate. A busy coach session does not push a resume insight out of the additional four, and it does fill the persona four with the newest conversation rows. One submitted answer writes both a response insight and an evaluation insight, so those four lines are about the last two answers while both writes succeed.

Equal `createdAt` values have no second sort key.

The line is `<topic> (<level>) via <source>`, then a detail chosen like this:

1. `notes` when it is not null. The full string is kept. There is no length cap. An empty string is not null, and it hides `payload` because the line treats it as no detail.
2. Otherwise the first of `payload.summary`, `payload.evaluation`, `payload.notes`, `payload.description` that is a non-empty string.
3. Otherwise `JSON.stringify(payload)`, cut at 280 characters with `...` appended when the JSON is longer. The cut is in the middle of the JSON text.

Nested fields are not searched. A raw ingest payload `{ resumeText, seed }` has no top-level `summary`, so the model sees a 280-character prefix of that JSON, not the resume text and not `seed.summary`. The derived ingest payload does have `summary`, so that insight line is the full extracted summary.

Indexing writes two insights:

| Insight | `notes` | What the later prompt shows |
| --- | --- | --- |
| `project-index` | null | 280-character prefix of `{ heuristics: ... }`, including the file list |
| `project-summary` | the request `description`, or null | The description when it was non-empty. The LLM summary in `payload.summary` is used only when `notes` is null |

The project highlight line still carries `Project.summary` (the raw model text). A description therefore hides the model summary on the insight line and not on the project line.

## How each prompt places the snapshot

`buildSectionContext` copies summary, skills, experience lines, project lines, and both insight lists onto the context when the client did not already send a non-empty value. It also appends `composeUserContextNotes` to `notes`.

That composed block caps skills at 20 names. The separate `Relevant Skills` line in the section prompt uses the full skills array. The same projects and insights can therefore appear twice in one section prompt: once as their own lists, and again inside `Notes`.

`createDeveloperProfilePrompt` does not use the composed notes. It prints every skill, the same three experience lines, three project lines, and four plus four insight lines. Empty groups are the literal `N/A`. Education and contact are still absent.

The studio developer-report card describes this as the full picture of stored data. The request is this window.
