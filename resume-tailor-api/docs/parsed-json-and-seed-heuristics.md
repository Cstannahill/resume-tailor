# Parsed JSON, seed heuristics, and match rules

`parseJsonResponse` succeeding is not the same as receiving the schema in the prompt. Several workflows then ignore keys they asked for, or throw when a required array is missing. Resume ingest also keeps a regex seed that rewrites common resume lines before the model runs.

Sources: `src/utils/json.ts`, `src/prompts/basePrompts.ts`, `src/modules/resumes/resume.service.ts`, `src/modules/intelligence/jobIntelligence.service.ts`, `src/modules/conversations/conversation.service.ts`, `src/modules/retrieval/retrieval.service.ts`, `src/modules/profile/{profile,userContext}.service.ts`, `src/repositories/insights/insight.repository.ts`, `src/repositories/projects/project.repository.ts`.

## Partial JSON is still a successful parse

`parseJsonResponse` returns the first value `JSON.parse` accepts. It does not check keys. Callers only use the unparseable fallback when the helper returns `undefined`.

| Workflow | Unparseable text | JSON object missing expected keys |
| --- | --- | --- |
| Job intelligence | Empty lists and `roleSummary: "Unable to parse job description. Provide more context."` | **Throws** if `requiredTechnologies` is missing or not an array (`.map` on `undefined`). That is a generic `Error`, so the client sees **500** `Internal Server Error`. |
| Developer report | Throws `LLM returned unstructured developer profile.` | Any object, including `{}`, is returned **200**. Missing `developerOverview` / arrays are not filled in. |
| Persona question | Canned question (`Describe how you would architect...`, difficulty `medium`) when `question` is missing | A `question` object without `text` is kept. `currentQuestion` is that `text`, so the session row is stored with `currentQuestion` null and is already complete. |
| Persona evaluation | Raw text, proficiency `unknown`, `insights: ['LLM returned unstructured response.']` | The object is stored as-is. `ConversationResponse.evaluation` is a required string; a parsed object with no `evaluation` fails the Prisma insert and surfaces as **500**. |
| Tailor | Raw model string; HTTP recommendations are empty arrays plus the unstructured note; DB `recommendations` omitted | Any parsed value (including `{ "content": "" }` or a bare array) takes the parsed branch. HTTP `recommendations` is that parsed value, not a normalized object. DB `recommendations` is `{ projectHighlights, resumeBullets, alignmentNotes }` taken off it, which may all be `undefined`. `content` uses `parsed.content` when that key is present, including `""`. |
| Resume section generate / improve | HTTP 200, `content` is the raw string, `rationale` is the `JSON.parse` error message | `content` must be truthy. `""` is treated as a parse failure (raw payload becomes `content`). An empty array is truthy and is returned. The response `section` is always the **URL** `:section`, not `parsed.section`. |

## Prompt keys that are not used after parse

| Prompt key | Where it is asked | What the code does with it |
| --- | --- | --- |
| `rubric` | Persona question JSON | Survives on `initialQuestion` only if the model included it. The session stores `question.text` alone. Difficulty and rubric are not columns. |
| `technologySignals` | Evaluation JSON | Kept inside the evaluator insight `payload` because the whole object is saved. Technology links use `focusAreas` on the first answer, otherwise `evaluation.insights`. `technologySignals` is never the link list. |
| `confidenceNotes` | Resume extraction JSON | `mergeInsights` copies `summary`, `skills`, `experiences`, `education`, and `contact` only. `confidenceNotes` is dropped before both insight payloads are written. |
| `importance` | Job tech objects (`core` \| `nice_to_have`) | Not read. Every non-empty `name` is matched the same way. `nice_to_have` does not change coverage. |

## Job match when the tech list is empty

`requiredTechnologies: []` does not throw and does not mean "consider every project".

1. `hasSome` is applied only when at least one name survived.
2. With an empty name list the query is the **25** newest projects in the database, with no owner filter.
3. `buildProjectMatches` drops a project unless one of its `technologies` equals a required name (case-insensitive). The required set is empty, so every project is dropped.
4. Resume matches are dropped the same way.

The HTTP body then has no project or resume matches. Callers cannot tell that from "nothing overlapped".

## Resume seed before the model runs

`seedInsightFromText` still runs on every ingest. `mergeInsights` keeps a seed field when the model omits it or returns an empty list.

### Skills line

A line is a skills line when it matches `/skills?/i` anywhere, so `Skilled in distributed systems` is one skill token.

Tokens are `split(/[,•|-]/)`, trimmed, and kept when `length > 1`.

| Input line | Stored tokens |
| --- | --- |
| `Skills: TypeScript, full-stack, Objective-C` | `Skills: TypeScript`, `full`, `stack`, `Objective` |
| `Skilled in distributed systems` | `Skilled in distributed systems` |

The label stays glued to the first token (`:` is not a delimiter). Hyphens split names. A leftover `C` from `Objective-C` is dropped because its length is 1. Unique cap is 25.

### Phone

`extractContact` keeps the first match of:

```text
(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}
```

That pattern matches year ranges and other digit runs, not only phone numbers:

| Text | First match stored as `contact.phone` |
| --- | --- |
| `2019-2024` | `2019-2024` |
| `Tenure 2019-2024 at Acme` | `2019-2024` |
| `Improved throughput 12000-34000 rps` | `12000-3400` |

`2018 to 2021` does not match (the word `to` is not a separator). The LLM contact object is shallow-merged on top of this seed, so a model that omits `phone` leaves the false match in `Resume.contact`.

Education in the seed is always `[]`.

## What section improve actually sends the model

`buildSectionContext` fills summary, skills, and (for `experiences` plus `experienceIndex`) role, company, and achievements from the **resume row** when the client left those fields empty. It also appends `composeUserContextNotes`.

`createResumeSectionImprovePrompt` then adds a separate `Existing Content` block from the request `currentContent`. Those two blocks can disagree. The studio sends the on-screen draft as `currentContent` and only a `notes` string in `context`, so the model sees the database resume in the context lines and the editor draft under Existing Content.

`tone` is optional on generate only (`Desired Tone:` is appended when set). Improve has no tone field.

## Context reads are not limited in SQL

`collectUserContext` calls `listInsightsByUser`, which loads **every** insight for the user (`createdAt` desc) and only then slices to 4 persona and 4 additional lines. The raw `resume-ingest` payload includes the full `resumeText`. Section generate, section improve, and `POST /profiles/developer-report` all pay that read.

Project lines in the same snapshot embed `Project.summary` with no length cap. Indexing stores the model summary as that string without parsing it.

## Project list search

`GET /projects?search=` is a case-insensitive `contains` on `name` and `description` only. It does not look at `summary`, `highlights`, or `technologies`.

`?technology=` is a separate exact `has` on the `technologies` string array (case-sensitive) and is AND-ed with search. The studio calls `listProjects()` with neither parameter.

## Related codepaths

- `src/modules/intelligence/jobIntelligence.service.ts` (`analyzeJobDescription`, `buildProjectMatches`)
- `src/modules/resumes/resume.service.ts` (`seedInsightFromText`, `mergeInsights`, `parseSuggestion`, `buildSectionContext`)
- `src/modules/conversations/conversation.service.ts` (`generatePersonaQuestion`, `submitConversationAnswer`)
- `src/modules/profile/userContext.service.ts` (`collectUserContext`)
- `src/repositories/projects/project.repository.ts` (`buildProjectWhere` is not search; `listProjects`)
- `resume-tailor-frontend/docs/studio-omitted-signals.md`
