# Form tokens and length floors

Two studio forms accept text the API then stores or rejects differently from the placeholder and the enabled button.

Sources: `src/components/modules/conversations/conversation-coach.tsx`, `src/components/modules/intelligence/job-intel-workbench.tsx`, `src/lib/api-client.ts`. API checks: `resume-tailor-api/src/modules/conversations/conversation.service.ts`, `resume-tailor-api/src/routes/intelligence.routes.ts`.

## Persona focus keeps the space after the comma

Start session sends:

```ts
focusAreas.split(",").filter(Boolean)
```

There is no `trim`. The field placeholder is `observability, scaling`.

| Typed value | Array posted |
| --- | --- |
| `` (empty) | `[]` |
| `observability` | `["observability"]` |
| `observability, scaling` | `["observability", " scaling"]` |
| `observability,,scaling` | `["observability", "scaling"]` |
| `observability, ,scaling` | `["observability", " ", "scaling"]` |
| ` , ` | `[" ", " "]` |

`filter(Boolean)` drops `""` only. A token that is spaces is kept.

`resolvePersona` replaces the preset focus list when `focusAreas.length` is greater than 0. `[" ", " "]` is long enough, so the React / Node presets are not used. An empty array still leaves the preset in place.

The raw array is stored on `ConversationSession.insights.focusAreas` and joined into `personaSummary` (`Focus Areas: observability,  scaling, Tone: …`). Technology rows created later run `trim()` and drop a token that trims to empty, so a leading space does not insert a second `Technology.name`. The session JSON still has the untrimmed string. The knowledge graph trims before it looks up a node, and the edge id still includes the original token.

The project indexer uses a different splitter for tags: `split(",").map(trim).filter(Boolean)`. Those tags are not stored. The coach splitter is the one that is stored.

## Job analysis enables before the API minimum

`POST /intelligence/job` requires `jobDescription` of at least **50** characters. The Analyze button is disabled only when the textarea is `""` or a request is in flight. One character is enough to send the request.

The route returns 400 `{ error: { message: "Validation failed", details: [/* zod issues */] } }`. `apiRequest` throws `Error` with `error.message` and drops `details`, so the toast is `Validation failed` with no field name and no minimum.

The cover-letter form rejects under 100 characters before the request. This form does not. Whitespace counts toward the 50 characters; the handler does not trim.
