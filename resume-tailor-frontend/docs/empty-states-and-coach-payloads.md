# Empty states and coach payloads

What the workspace shows when a query fails, and what the persona coach actually posts. Verified against `src/components/dashboard/kpi-grid.tsx`, `src/components/modules/projects/project-list.tsx`, `src/components/modules/knowledge-graph/graph-panel.tsx`, `src/components/modules/resume/resume-insights-card.tsx`, `src/components/modules/retrieval/tailored-assets-card.tsx`, and `src/components/modules/conversations/conversation-coach.tsx`.

## A failed query uses the empty copy

These panels branch on `isLoading` and on whether `data` is missing. They do not read `isError`. React Query's default retry is 1, so the empty copy appears after the second failure.

| Surface | What a failure looks like |
| --- | --- |
| Recent projects | "Index a project to see AI insights here." |
| Knowledge graph | "Index projects or ingest resumes to populate the knowledge graph." Summary tiles stay hidden. |
| KPI: indexed projects, resume records, tailored assets | `0` |
| KPI: coaching sessions | `1`, once the skeleton clears, including when the other three queries failed |
| Tailored assets | "Generate a cover letter to see it here." |
| Resume intelligence | "Upload a resume to get started." |

The KPI skeleton stays up until projects, resumes, **and** tailored assets have all left `isLoading`. One slow query hides the numbers that already arrived. Projects and the KPI share `queryKey: ["projects"]`, so one `GET /projects` failure zeros the count and empties the list together.

Resume intelligence is different when the list **succeeds** but the row has no `insight` (the list payload is Prisma columns). `!latest` is false, so the upload line is skipped, and the skill/experience blocks never render. The card body is blank; the footer link remains.

The model catalog is the panel that does handle errors: "Failed to load model catalog" plus Retry.

## Graph hit testing

The tooltip uses `nodesRef.current.find`. The first node whose center is within 10px wins, not the closest. Order is the API node array. Overlapping dots keep the earlier label.

`ResizeObserver` writes width and leaves height at 420. A width change rebuilds the force layout (240 ticks) from new positions. Filter pills only recolor; they do not rebuild the simulation.

## Coach requests

`ConversationCoach` has no provider select.

| Action | Body |
| --- | --- |
| Start / Restart | `{ personaTopic, focusAreas }`. Default topic is `frontend-react` (first `PERSONA_TOPICS` entry). No `llmProvider`. |
| Submit answer | `{ userAnswer, thoughtProcess }`. `thoughtProcess` is always present, including `""` when the box is empty. No `llmProvider`. |

Restart calls start again and replaces React state with the new session. The previous session id is dropped from the page and left in Postgres. There is no delete route, and `getConversation` is never called, so that session is not reachable from the UI.

Focus areas are `focusAreas.split(",").filter(Boolean)` with no trim. An empty box becomes `[]`, and the API then keeps the preset focus list. A value like `"observability, scaling"` is stored as `" scaling"` with the leading space.
