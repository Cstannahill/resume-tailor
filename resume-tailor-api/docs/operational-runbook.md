# Operational runbook

Constraints and behaviors that bite during local setup and API integration. Verified against route Zod schemas and the services they call.

## Request validation

| Route | Field | Minimum / enum |
| --- | --- | --- |
| `POST /auth/register` | `password` | 8 characters |
| `POST /resumes/ingest` | `resumeText` | 50 characters |
| `POST /intelligence/job` | `jobDescription` | 50 characters |
| `POST /retrieval/tailor` | `jobTitle` | 1 character |
| `POST /retrieval/tailor` | `jobDescription` | 30 characters |
| `POST /retrieval/tailor` | `assetType` | `resume` \| `cover_letter` \| `summary` (default **`summary`** if omitted) |
| `POST /conversations/session` | `personaTopic` | required, non-empty |
| `PUT /settings/provider-keys` | `apiKey` | 8 characters |
| JSON body (all routes) | — | 2mb (`express.json`) |

The UI is often stricter than the API (see `resume-tailor-frontend/docs/app-workflows.md`). Direct API callers can still hit these floors.

## Auth and errors

- JWTs are signed with `AUTH_JWT_SECRET` (startup requires **≥ 32 characters**) and default to **1 day** expiry (`src/utils/jwt.ts`).
- `optionalAuth` runs on every request: invalid tokens are ignored on public routes.
- `authenticate` also checks that the user still exists; missing users return `{ error: { message: "Unauthorized" } }` with `401`.
- `HttpError` responses are `{ error: { message, details? } }`. Unhandled `Error` values become **500 Internal Server Error**.
- Conversation **GET** uses `HttpError(403)` for another user's session. Conversation **respond** throws a generic `Error('Forbidden')` / `Error('Conversation session not found or already completed')`, which currently surfaces as **500**, not 403/404.

## LLM runtime

- `getLLMAdapter(provider)` uses the per-request `llmProvider` or `DEFAULT_LLM_PROVIDER`. It does **not** read `UserSetting.defaultLlmProvider` or decrypted `/settings/provider-keys`.
- Ollama chat default model is `minimax-m2:cloud` (`src/adapters/llm/ollama.adapter.ts`). Missing `OLLAMA_API_KEY` throws before the request is sent.
- Catalog routes are public. Provider catalogs cache **10 minutes**, including error catalogs (`status: "error"`, empty `models`). Ollama `/llm/ollama/tags` caches **5 minutes** and requires `OLLAMA_API_KEY`.
- Google listing still calls the Generative Language `models` endpoint with the API key; failures are cached like other providers.

## Scoping pitfalls

These list/match helpers are **not** all owner-scoped:

| Workflow | Resume scope | Project scope |
| --- | --- | --- |
| `POST /retrieval/tailor` | `resumeId` if sent, else caller's newest resume | Explicit `projectIds` if sent, else `listProjects({ limit: 3 })` — **all projects**, not the caller's |
| `POST /intelligence/job` | Caller's resumes | Up to 25 newest projects, optionally `technologies hasSome` required tech names — **not filtered by owner** |
| `GET /knowledge-graph?userId=` | Resume + conversation-session nodes | Project nodes stay unscoped |
| Developer report / resume-section context | Newest owned resume | Owned projects only (`listProjects({ ownerId })`) |

Pass `projectIds` on tailor requests if you need the letter grounded in the signed-in user's repos.

## Persona coaching

Backend presets in `conversation.service.ts`:

| `personaTopic` key | Stored topic | Default focus areas |
| --- | --- | --- |
| `full-stack` | Full-Stack Engineering | API design, performant React, DevOps pipelines |
| `frontend-react` | React & Frontend Architecture | state management, performance optimization, testing |
| `backend-node` | Node.js Systems Design | scalability, observability, data modeling |

Any other string (including frontend options `platform-aws` and `ai-ml`) becomes a generic persona: `topic` is the raw string, `focusAreas` is the request list (or empty), tone `probing`.

Each answer writes two insights: `conversation-response` (raw) and `conversation-evaluator` (derived). User-context persona snapshots only keep insights whose `source` contains `conversation`.

## JSON parse fallbacks

`parseJsonResponse` (`src/utils/json.ts`) strips fences and takes the first `{...}` / `[...]` block.

| Module | Unparseable LLM output |
| --- | --- |
| Retrieval / cover letter | Stores raw text; recommendations get the unstructured-response note |
| Resume sections | HTTP 200 with raw `content` + parse `rationale` |
| Job intelligence | Falls back to empty insight lists and a generic `roleSummary` |
| Conversations | Evaluation text is the raw model output; proficiency `unknown` |
| Developer report | Request **fails** (`LLM returned unstructured developer profile.`) |

## Startup env

| Variable | Hard failure if |
| --- | --- |
| `DATABASE_URL` | Missing / not a URL |
| `AUTH_JWT_SECRET` | Shorter than 32 characters |
| `APP_ENCRYPTION_KEY` | Missing, or base64 that does not decode to **exactly 32 bytes** |

Generate a key with `openssl rand -base64 32`.
