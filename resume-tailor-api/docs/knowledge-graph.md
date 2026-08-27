# Knowledge graph

`GET /knowledge-graph` builds a force-layout payload from projects, resumes, technologies, artifacts, and conversation sessions.

Source of truth: `src/modules/knowledgeGraph/knowledgeGraph.service.ts`, `src/routes/knowledgeGraph.routes.ts`.

## Auth and scoping

The route is **public**. There is no `authenticate` middleware. `optionalAuth` may attach `req.user`, but the controller **never reads the JWT**.

| Query | Effect |
| --- | --- |
| omitted | **All** projects, resumes, sessions, and technologies |
| `?userId=<uuid>` | Filters **resume** and **conversation-session** nodes to that user. Project nodes stay global. |

The Next.js panel (`fetchKnowledgeGraph()`) calls `/knowledge-graph` with **no** `userId`, so the dashboard graph is infrastructure-wide.

## Construction

```text
load all projects (+ tech links + artifacts)
load resumes (optionally user-scoped)
load conversation sessions (optionally user-scoped)
load Technology rows
        |
emit nodes + edges
        |
summarize counts and top 10 technologies by connection count
```

### Nodes

| `type` | `id` | Label / metadata |
| --- | --- | --- |
| `project` | `project:<id>` | name; `technologies`, `summary`, `keyMetrics` |
| `resume` | `resume:<id>` | `Resume <sourceName>`; `userId`, summary, skills |
| `technology` | `technology:<id>` or `technology:virtual:<name>` | catalog name, or a virtual node from persona focus text |
| `artifact` | `artifact:<id>` | `kind` (`source_file` / `heuristic` / `summary`); path + preview |
| `persona` | `persona:<sessionId>` | session `personaTopic`; `userId`, `personaSummary` |

### Edges

| `type` | From → to | When |
| --- | --- | --- |
| `technology_to_project` | tech → project | `ProjectTechnology` join |
| `project_to_artifact` | project → artifact | every stored artifact |
| `technology_to_resume` | tech → resume | `ResumeTechnology` join |
| `persona_focus` | persona → tech | each string in `session.insights.focusAreas` |

`topTechnologies` ranks technology nodes by how many incident edges they have (including artifact-driven degree on the other end of project edges). Cap is 10.

## Constraints

- **Artifact volume.** Indexing writes one `source_file` artifact per analyzed file (cap 250) plus `heuristic` and `summary`. Those become graph nodes. A few indexed repos produce hundreds of artifact nodes; the d3 panel renders them all.
- **Project technologies are languages**, not libraries (`TypeScript`, `Python`, … from file extensions). Graph tech nodes from projects therefore look like languages. Resume skills and persona focus areas add library-like names as separate nodes (or virtual nodes).
- **Persona edges depend on `insights.focusAreas`.** After the first coaching answer, the session `insights` JSON is replaced with `{ lastEvaluation }` (see `conversation-sessions.md`). Later graph builds emit the persona node **without** `persona_focus` edges.
- Virtual technology ids are `technology:virtual:<lowercase name>` and are not `Technology` rows.

## Related codepaths

- `src/modules/knowledgeGraph/knowledgeGraph.{controller,service,types}.ts`
- `src/modules/conversations/conversation.utils.ts` (`extractFocusAreasFromInsights`)
- `resume-tailor-frontend/src/services/knowledge-graph.ts`
- `resume-tailor-frontend/src/components/modules/knowledge-graph/graph-panel.tsx`
