# Dashboard, graph canvas, and client errors

What the workspace actually renders after a successful index or graph fetch, and which API error fields never reach the UI.

Sources: `src/components/modules/projects/project-list.tsx`, `src/components/modules/projects/project-indexer.tsx`, `src/components/modules/knowledge-graph/graph-panel.tsx`, `src/lib/api-client.ts`.

## Project list shows the blurb, not the model summary

`ProjectList` calls `listProjects()` with no `search`, `technology`, or `mine` query. The card copy says summaries come from source code. The row body renders `project.description` (the optional text typed into the index form).

The model summary is `project.summary` on the same payload and is not rendered. The success toast on the index form is the only place that surfaces it (`data.summary` from `POST /projects/index`).

`highlights` on the row are the heuristic strings from indexing, not the model output. The card prints the first two:

1. `Analyzed N key source files`
2. `Primary languages: ...`

The third (`Detected N exported components`) is dropped. The badge is `technologies[0]`, or the literal `LLM` when that array is empty. Up to three technology names are repeated in the footer next to `updatedAt`.

The frontend `Project` type includes `tags: string[]`. The API project row has no `tags` column; the indexer accepts tags and the API discards them.

## Index form is stricter than the route

| Form (`project-indexer.tsx`) | API `POST /projects/index` |
| --- | --- |
| `name` minimum **2** characters | minimum **1** |
| GitHub submits `shallow: true` always | `shallow` defaults to true; `false` clones full history |
| Tags input exists only on the GitHub tab | `tags` is accepted and not stored |
| Local path placeholder is `C:\projects\sample` | Path is read on the **API host** |

There is no control for a full clone. A single-character name that the API would accept never leaves the form.

## Graph canvas

`KnowledgeGraphPanel` loads `GET /knowledge-graph` with no `userId`. Filter pills (`All`, `Projects`, `Resumes`, `Technologies`, `Artifacts`, `Personas`) do not remove nodes or edges. The selected type is drawn at radius 7 with a saturated color; other nodes stay at radius 5 and a lighter color. Every edge is stroked the same way.

The canvas does not draw labels. A pointer within **10px** of a node shows a tooltip with `label` and the type name only. `metadata` (summary, path, skills, `keyMetrics`) is not shown.

Layout is a `d3-force` simulation advanced **240** ticks and then stopped. A `requestAnimationFrame` loop keeps clearing and redrawing those fixed coordinates. Duplicate technology nodes from the API (see `resume-tailor-api/docs/indexing-sample-and-http-errors.md`) show up as two dots with the same label.

## Client errors drop `details`

`apiRequest` (`src/lib/api-client.ts`):

- Sends `Content-Type: application/json` on every call, including GETs.
- On **401**, throws `Error("Unauthorized")` with `code = 401` before reading the body.
- On any other non-OK response, throws `Error` with `error.message` only.

Zod failures return `400` and `error.details` (the issue array). The studio never reads `details`, so index and form toasts show `Validation failed` without the field paths. A malformed JSON body or a payload over 2mb is a non-`HttpError` on the API and arrives as `Internal Server Error`; the parser message stays in the API log.

`handleResponse` returns `json.data` and discards sibling fields. Callers that expect the full envelope will see `undefined`.

## Related codepaths

- `src/services/projects.ts` (`listProjects`, `indexProject`)
- `src/types/projects.ts` (`Project.tags`, `Project.summary`)
- `src/components/modules/knowledge-graph/graph-panel.tsx` (`GraphCanvas`, `FilterPill`)
- `src/lib/api-client.ts`
- `src/components/providers/app-providers.tsx` (queries stale after 60s, one retry; mutations do not retry)
