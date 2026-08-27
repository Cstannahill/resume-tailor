# Conversation sessions

Persona coaching is a short LLM loop: pick a persona, ask a question, evaluate the answer, optionally ask another.

Source of truth: `src/modules/conversations/conversation.service.ts`, `src/routes/conversation.routes.ts`.

## Lifecycle

```text
POST /conversations/session
  resolve persona (preset or generic)
  LLM initial question
  persist session: currentQuestion set, insights = { focusAreas }
        |
POST /conversations/session/:id/respond  (repeat)
  require session.currentQuestion
  require session.userId === JWT user
  LLM evaluation
  append ConversationResponse
  write conversation-response + conversation-evaluator insights
  set currentQuestion = evaluation.nextQuestion?.text ?? null
  replace insights with { lastEvaluation }
        |
GET /conversations/session/:id
```

`currentQuestion === null` means the session is **complete**. A further respond throws `Error('Conversation session not found or already completed')`.

## Personas

Lookup is `personaTopic.toLowerCase()` against this catalog:

| Request key | Stored `personaTopic` | Default focus areas | Tone |
| --- | --- | --- | --- |
| `full-stack` | Full-Stack Engineering | API design, performant React, DevOps pipelines | probing |
| `frontend-react` | React & Frontend Architecture | state management, performance optimization, testing | supportive |
| `backend-node` | Node.js Systems Design | scalability, observability, data modeling | directive |

Any other string (including UI options `platform-aws` and `ai-ml`) becomes a generic persona: `topic` is the raw string, `focusAreas` is the request list (or empty), tone `probing`. Request `focusAreas` override preset lists when non-empty.

The stored `personaSummary` is a single string: `Focus Areas: …, Tone: …, Level: …`.

## Insight overwrite (pitfall)

On start, `ConversationSession.insights` is `{ focusAreas: string[] }`.

On every successful respond, `updateConversationSession` **replaces** that JSON with `{ lastEvaluation: evaluation }`. `extractFocusAreasFromInsights` only reads `.focusAreas`, so:

- The **first** answer still tags insights with the original focus-area names.
- Later answers fall back to `evaluation.insights` for evaluator technology names, and the knowledge graph loses `persona_focus` edges (see `knowledge-graph.md`).

## Errors

| Call | Missing session | Wrong owner | Completed (`currentQuestion` null) |
| --- | --- | --- | --- |
| GET | `HttpError` **404** | `HttpError` **403** | returns the session |
| respond | generic `Error` → **500** | generic `Error('Forbidden')` → **500** | generic `Error` → **500** |

Unhandled `Error` values become `{ error: { message: "Internal Server Error" } }`.

## Insights written per answer

| `source` | `layer` | Payload |
| --- | --- | --- |
| `conversation-response` | raw | question, `userAnswer`, `thoughtProcess` |
| `conversation-evaluator` | derived | full evaluation; `notes` = evaluation text; `level` = `proficiencyLevel` |

User-context persona snapshots keep insights whose `source` contains `conversation`.

If the evaluator JSON cannot be parsed: `evaluation` is the raw model text, `proficiencyLevel` is `unknown`, `insights` is `['LLM returned unstructured response.']`, and `nextQuestion` is omitted → session completes.

## Related codepaths

- `src/modules/conversations/conversation.{controller,service,utils,types}.ts`
- `src/repositories/conversations/conversation.repository.ts`
- `resume-tailor-frontend/src/lib/constants.ts` (`PERSONA_TOPICS`)
- `resume-tailor-frontend/src/components/modules/conversations/conversation-coach.tsx`
