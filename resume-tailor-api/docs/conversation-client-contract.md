# Conversation client contract

Persona coaching persists a Prisma session whose JSON shape is not what the studio types or renders. There is also no list-sessions route, so the dashboard KPI cannot be a real count.

This is distinct from preset keys (`platform-aws` / `ai-ml`), insight `focusAreas` overwrite, and respond-ownership **500**s.

Sources: `src/modules/conversations/*`, `src/repositories/conversations/*`, `prisma/schema.prisma` (`ConversationSession`, `ConversationResponse`, `Insight`), `resume-tailor-frontend/src/{types/conversations.ts,components/modules/conversations/conversation-coach.tsx,services/conversations.ts}`.

## What the API stores vs what the UI reads

### Session (`GET` / start / respond `data.session`)

| Prisma / service | Frontend `ConversationSession` |
| --- | --- |
| `currentQuestion String?` (the question text, or `null` if complete) | `currentQuestion?: { text, difficulty? }` |
| `insights Json?` (`{ focusAreas }` then `{ lastEvaluation }`) | `insights?: string[]` |
| `personaSummary String` | not typed; UI types `focusAreas?: string[]` on the session |
| `responses ConversationResponse[]` | `responses: ConversationResponse[]` (different row shape) |

The coach keeps `currentQuestion` in React state from `initialQuestion` / `evaluation.nextQuestion`, so the prompt card still works. Anything that read `session.currentQuestion.text` would break.

### Each answer row

| Prisma `ConversationResponse` | Frontend `ConversationResponse` | Coach UI |
| --- | --- | --- |
| `question String` | `question: { text, difficulty? }` | `{response.question.text}` → **undefined** (history headings blank) |
| `userAnswer String` | `userAnswer` | shown |
| `evaluation String` | `evaluation?: string` | shown |
| `followUpPlan String?` | not typed | not shown |
| — | `insights?`, `proficiencyLevel?` | not on the row |

History keys off `response.createdAt`. `thoughtProcess` is stored only on the raw Insight payload (`source: conversation-response`), not on `ConversationResponse`.

## Respond payload is a stale session snapshot

`submitConversationAnswer` returns the session from `appendConversationResponse` **before** `updateConversationSession` writes the next `currentQuestion` and replaces `insights`.

So `data.session` after respond still has:

- `currentQuestion` = the question that was just answered
- `insights` = `{ focusAreas }` (start-of-session JSON), not `{ lastEvaluation }`

The coach then does `setCurrentQuestion(payload.evaluation.nextQuestion ?? null)`, which is why the next prompt appears. Reloading via `GET /conversations/session/:id` is the source of truth for completion (`currentQuestion === null`) and overwritten insights.

`getConversation()` exists in the frontend service and is never called. Session id lives in component state only — refresh abandons the session. There is **no** `GET /conversations` list; KPI "Coaching sessions" is hardcoded to `1`.

## Focus-area parsing

The coach sends `focusAreas: focusAreas.split(",").filter(Boolean)` with **no trim**. `"observability, scaling"` becomes `["observability", " scaling"]`. Empty tokens are dropped; padded tokens are stored and later used as insight technology names / graph labels.

## Insight pointer columns are not relations

`Insight.projectId`, `resumeId`, `conversationSessionId`, and `conversationResponseId` are plain nullable strings. Prisma does not declare `@relation` / `onDelete` for them. Deleting a session or resume leaves those insight rows in place with dangling ids. User delete still cascades `Insight` via `userId`.

## Related codepaths

- `src/modules/conversations/conversation.{service,controller,types}.ts`
- `src/repositories/conversations/conversation.repository.ts`
- `src/repositories/insights/insight.repository.ts`
- `prisma/schema.prisma`
- `resume-tailor-frontend/src/components/modules/conversations/conversation-coach.tsx`
- `resume-tailor-frontend/src/types/conversations.ts`
- `resume-tailor-frontend/src/services/conversations.ts`
