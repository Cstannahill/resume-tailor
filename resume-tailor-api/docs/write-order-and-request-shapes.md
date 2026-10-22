# Write order and request shapes

Constraints that sit under the route tables: which row an insight points at, which JSON fields Zod drops before a service runs, and how project identity is matched. Verified against `src/modules/conversations/conversation.service.ts`, `src/repositories/conversations/conversation.repository.ts`, `src/routes/resume.routes.ts`, `src/modules/projects/projectIndexing.service.ts`, and `src/repositories/projects/project.repository.ts`.

## Coaching answers are not ordered

Every session read uses `include: { responses: true }` and no `orderBy` (`createConversationSession`, `appendConversationResponse`, `updateConversationSession`, `getConversationSessionById`).

After a respond, the service treats the last element as the row it just inserted:

```ts
const latestResponse = updatedSession.responses.at(-1);
```

That id is written to `conversationResponseId` on both new insights (`conversation-response` and `conversation-evaluator`). `ConversationResponse.id` is a random UUID. PostgreSQL does not promise that an unordered include comes back in insert order. With a single answer, `at(-1)` is that row. From the second answer on, the new insights can point at an older response. `GET /conversations/session/:id` returns `responses` in that same unspecified order.

## Blank thought process is not `N/A`

`createConversationEvaluationPrompt` prints `Thought Process: ${answer.thoughtProcess ?? 'N/A'}`. Only `null` or `undefined` becomes `N/A`.

The studio always sends the key. `ConversationCoach` initializes `thoughtProcess` to `""` and posts `{ userAnswer, thoughtProcess }` even when the optional box is empty. The model sees a blank line. Omit the field on a direct API call to get `N/A`. `null` fails Zod (`z.string().optional()`).

## Initial question fallback

`generatePersonaQuestion` uses this object only when `parseJsonResponse` yields no `question`:

```json
{
  "text": "Describe how you would architect a production-ready service for this persona.",
  "difficulty": "medium"
}
```

That string is stored on `currentQuestion`, so the session is answerable. A parsed `question` object that has no `text` is a different path: `currentQuestion` is stored as `null`, and the session is already complete.

## Preset level and tone

`personaTopic.toLowerCase()` selects the catalog. A non-empty `focusAreas` array replaces the focus list only. Level and tone stay on the preset. Any other topic, including studio values `platform-aws` and `ai-ml`, uses level `advanced` and tone `probing`, with the request focus list or `[]`.

| Request key | `expertiseLevel` | Tone |
| --- | --- | --- |
| `full-stack` | `expert` | `probing` |
| `frontend-react` | `advanced` | `supportive` |
| `backend-node` | `advanced` | `directive` |

`personaSummary` is one string: `Focus Areas: …, Tone: …, Level: …`. The question prompt includes that level and tone. The coach does not send `llmProvider`, so start and respond use `DEFAULT_LLM_PROVIDER`.

## Section evidence arrays are stripped

`sectionContextSchema` allows only `jobTitle`, `company`, `experienceIndex` (integer ≥ 0), `achievements`, `summary`, `skills`, and `notes`. `validateBody` replaces `req.body` with the parsed object.

These context fields are not in the schema, so they never reach `buildSectionContext`:

- `resumeHighlights`
- `projectHighlights`
- `personaInsights`
- `additionalInsights`

The service then fills each missing array from `collectUserContext`. Callers cannot override them. Fields that are in the schema are kept, and the snapshot fills only the gaps.

`section` is also stripped from the body. The controller sets it from the URL (`summary`, `skills`, `experiences`, `education`, `contact`). `tone` is a sibling of `context`. The resume builder sends `tone: "concise"` only on summary **generate**. Improve sends `currentContent` and `instructions`, not `tone`.

Summary improve wraps the draft in a one-element array (`[draft.summary]`, or `[]` when the draft summary is empty). Experience improve sends that role's `achievements` array, not company or role. The prompt JSON-stringifies that value as `Existing Content`, while `Summary Context` can still be the stored resume summary.

## Project identity is not unique

`Project.repoUrl` and `Project.localPath` have no unique index. `upsertProject` is `findFirst` on an `OR` of those keys (no `orderBy`), then `update` or `create`, outside a transaction.

Two indexes of the same URL can both observe no row and both insert. A later index updates whichever duplicate `findFirst` returns. `GET /projects` and the knowledge graph list every row.

`repoUrl` is `z.string().url()`. `git@github.com:org/repo.git` fails validation before clone. Use an `https://` URL.

## Local path and clone cleanup

| Local path | Result |
| --- | --- |
| Exists and is not a directory | `400` `Provided local path <path> is not a directory` |
| Missing, or `stat` throws (`ENOENT`, `EACCES`) | Generic `Error` → `500` `Internal Server Error` (the path is in the log) |

GitHub checkouts go to `os.tmpdir()/project-<uuid>`. `indexProject`'s `finally` deletes that directory. If `fs.rm` throws, the exception replaces a successful result: the project row is already committed and the client still gets `500`.

The `catch` logs `{ error }`, not pino's `err` key, then rethrows. That line often serializes as an empty object. `errorHandler` logs `{ err }` on the way out.
