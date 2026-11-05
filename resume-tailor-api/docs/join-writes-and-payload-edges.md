# Join writes and payload edges

Verified against `src/repositories/technologies/technology.repository.ts`, `src/modules/resumes/resume.service.ts`, `src/modules/projects/projectIndexing.service.ts`, `src/config/env.ts`, `src/app.ts`, `src/middleware/authenticate.ts`, `src/adapters/llm/ollama.adapter.ts`, and `src/modules/llm/llm.service.ts`.

## Technology links are not deleted before the insert attempt

`syncProjectTechnologies` and `syncResumeTechnologies` share one control flow.

| Caller list | What runs |
| --- | --- |
| Length 0 | `deleteMany` for that project or resume, then return. `ensureTechnologies` is not called. |
| Length > 0 | `ensureTechnologies` first, then `deleteMany`, then `createMany` of the original list. |

`ensureTechnologies` inserts missing names in one `$transaction` of `technology.create` calls. `Technology.name` is unique and case-sensitive. A concurrent index that loses that race throws inside `ensureTechnologies`. On that path the join rows are still the previous set: `deleteMany` has not run. The project row and its artifacts are already committed (`upsertProject`, then `replaceProjectArtifacts`, then this helper). The HTTP result is 500. A later index of the same repo URL or local path updates that project and retries the links.

After `ensureTechnologies` succeeds, `deleteMany` removes the join rows and `createMany` inserts the new ones. A failure in `createMany` leaves the project or resume with no technology links until another successful sync.

Names are trimmed. A whitespace-only name is omitted from the catalog and from `createMany`. `ensureTechnologies` still returns first, and `deleteMany` then clears that parent’s join rows.

## Repeated names become repeated join rows

There is no unique constraint on `(projectId, technologyId)` or `(resumeId, technologyId)`. `createMany` walks the caller array, not the deduped catalog map. Two `"React"` skills on one ingest insert two `ResumeTechnology` rows for the same technology. The knowledge graph emits both edges and counts both toward `topTechnologies`.

`attachTechnologiesToInsight` is the other path. It inserts `Object.values` of the catalog map, so repeated names in one call become one `InsightTechnology` row. The `context` column is the insight `source` string (`project-index`, `project-summary`, `resume-ingest`, `conversation-response`, `conversation-evaluator`).

No route reads `InsightTechnology`. `buildKnowledgeGraph` loads projects, resumes, sessions, and `Technology`. It never loads `Insight` or `InsightTechnology`. Those rows are write-only. Re-index appends new insights, so the table grows even though the graph draws `ProjectTechnology` and `ResumeTechnology` instead.

## Experience PATCH treats each element as an object

`normalizeSectionContent` for `experiences` maps every array element with `exp.company`, `exp.role`, and `exp.achievements`. It does not read the element when the element is a string.

| `content` element | Stored entry |
| --- | --- |
| `{ company, role, achievements, notes }` | `company`, `role`, `achievements` only. `notes` is dropped. |
| `"Optimized payments flow"` | `{ "achievements": [] }`. The sentence is discarded. |
| `5` | `{ "achievements": [] }` |
| `null` | Throws `Cannot read properties of null (reading 'company')`, which is a generic `Error` and becomes **500** `Internal Server Error`. |

`docs/frontendv2.md` shows a PATCH body whose `content` is an array of bullet strings. That body matches this mapper only for `skills` (each item is `String(item)`) or, for `summary`, as `JSON.stringify` of the whole array. Sent to `sections/experiences`, it replaces the column with one empty achievement list per string.

The studio Apply path sends the local experience objects, not that string array. A direct client that copies the generate-response bullets into PATCH does not.

`education` stores an array as given, including an array of strings. It does not run the experience mapper. A string (not an array) becomes `[{ summary }]`.

## CORS allow-list and bearer prefix

`CORS_ALLOWED_ORIGINS` is split on commas and trimmed. Blank pieces are removed. The default `http://localhost:3000` applies only when the variable is **unset** (`??`). An empty value or a whitespace-only value parses to `[]`, so the default is not restored. Browser origins then fail the callback with `Not allowed by CORS`, and `errorHandler` turns that into **500** because it is not an `HttpError`. Requests with no `Origin` are still allowed.

The CORS middleware sets `credentials: true`, so a permitted browser origin is reflected rather than `*`.

`optionalAuth` and `authenticate` both take the token with `header.replace(/^Bearer\s+/i, '')`. The scheme is case-insensitive and must be followed by whitespace. A raw JWT with no scheme is verified as-is and fails. `Bearer` with no token leaves an empty string and fails the same way. `optionalAuth` ignores that failure. `authenticate` responds **401** `Unauthorized` and does not log it.

## Ollama choices and catalog fields

`OllamaAdapter` reads `payload.choices.at(0)?.message.content ?? ""`.

| Payload | Result |
| --- | --- |
| `choices: []` | `""` (the missing element short-circuits) |
| `choices` omitted | Throws reading `at` → **500** |
| `choices: [{}]` (`message` missing) | Throws reading `content` → **500** |
| `choices: [{ message: {} }]` or `content: null` | `""` |
| `content: ""` | `""` (empty string is kept) |

Catalog mapping that the route returns and the studio types do not share:

| Provider | Fields actually set |
| --- | --- |
| Ollama | `name` from `/api/tags`. `description` is always `"Available Ollama Cloud model"`. `isFree` is always `false`. |
| Google | `name` is the upstream `name` (`models/…`). `description` is `displayName`, then `description`. `tags` is `supportedGenerationMethods` (strings only). `contextWindow` is `inputTokenLimit`. |
| OpenRouter | `name` is `String(id ?? name)`. `contextWindow` is `context_length` when it is a number. `isFree` is set only when `pricing.prompt` is the string `"0"`. |
| Bedrock | `name` is `modelId`, else `modelName`, else `"unknown"`. `tags` is `[modelArn]` when the ARN exists. |

`GET /llm/models` returns providers in this order: `ollama`, `openrouter`, `bedrock`, `google`.
