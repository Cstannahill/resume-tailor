# Resume Tailor API

Modern Express + TypeScript (ESM) platform that indexes engineering projects, parses resumes, runs persona-based interviews, generates tailored job collateral, and surfaces knowledge graphs/intelligence insights. Everything is secured with JWT auth, user-specific settings, and encrypted provider keys on PostgreSQL via Prisma.

## Feature Highlights

- **Auth & Settings**
  - Email + password registration/login (`/auth/*`) issuing JWTs.
  - User profile updates plus per-user defaults (`/settings`) and encrypted provider-key storage.
- **Project Intelligence**
  - Project indexing from GitHub or local paths with heuristics, metrics, and LLM summaries.
  - Knowledge graph API linking projects/resumes/technologies/artifacts/personas.
- **Resume & Persona Coaching**
  - Resume ingestion → structured insights + skill extraction.
  - Resume-section generate/improve/patch workflows with server-side context enrichment.
  - Persona conversations with adaptive questioning, evaluation, and layered insights.
- **Developer Profile**
  - Baseline report generation from a user's latest resume, indexed projects, and persona insights.
- **Retrieval & Job Intelligence**
  - Tailored resume/cover-letter generation tied to stored assets.
  - Job description analyzer that highlights required tech, seniority signals, cultural cues, and matches against user portfolios.
- **LLM Abstraction Layer**
  - Pluggable adapters for **Ollama Cloud**, **AWS Bedrock**, **Google GenAI**, and **OpenRouter**.
  - `/llm/models` + `/llm/ollama/tags` catalog endpoints for frontend model pickers.

## Tech Stack

- Node 20+, Express (ESM, `tsx` for dev runtime)
- Prisma ORM + PostgreSQL
- Zod validation, Pino logging
- JWT auth (`jsonwebtoken`) and bcrypt password hashing
- AES-256-GCM encryption for provider keys

## Project Structure

```
src/
  adapters/llm/              # Provider adapters, factory, tags client
  config/                    # Env parsing + logger
  db/                        # Prisma client
  middleware/                # Auth, validation, errors
  modules/
    auth/                    # Register/login/profile
    settings/                # User defaults & provider keys
    projects/                # Indexing + knowledge graph
    resumes/
    conversations/
    retrieval/
    intelligence/            # Job description analyzer
    knowledgeGraph/          # Project/resume/technology/persona graph builder
    profile/                 # Shared user context + developer baseline reports
  repositories/              # Prisma data access helpers
  routes/                    # Express routers per module
  app.ts                     # Express bootstrap
  server.ts                  # Entrypoint
```

## Environment Variables

Copy `.env.example` → `.env` and fill:

| Variable | Description |
| --- | --- |
| `PORT` | API port; defaults to `4000` |
| `NODE_ENV` | `development`, `production`, or `test`; returned by `/health` |
| `DATABASE_URL` | PostgreSQL connection string |
| `DEFAULT_LLM_PROVIDER` | One of `ollama`, `bedrock`, `google`, or `openrouter` |
| `OLLAMA_BASE_URL`, `OLLAMA_API_KEY` | Ollama Cloud config |
| `BEDROCK_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS Bedrock creds |
| `GOOGLE_GENAI_API_KEY` | Google GenAI key |
| `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` | OpenRouter config |
| `AUTH_JWT_SECRET` | JWT signing secret; **minimum 32 characters** or the process fails at startup |
| `APP_ENCRYPTION_KEY` | Base64 that **decodes to exactly 32 bytes** for AES-256-GCM |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins; defaults to `http://localhost:3000` if omitted |

Runtime constraints:

- JSON bodies are capped at **2mb** (`express.json({ limit: '2mb' })`).
- LLM adapters read **process environment variables**, not keys stored via `/settings/provider-keys`.
- `settings.defaultLlmProvider` is persisted but `getLLMAdapter()` currently falls back to `DEFAULT_LLM_PROVIDER` (or a per-request `llmProvider`).

## Getting Started

1. Install deps: `npm install`.
2. Copy `.env.example` → `.env`, fill values above.
3. Generate Prisma client: `npx prisma generate`
4. Apply migrations: `npx prisma migrate dev`
5. Start dev server: `npm run dev`

The API listens on `http://localhost:${PORT}` (default `4000`).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Express via `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run `dist/server.js` (after `npm run build`) |
| `npm run lint` | ESLint (TS), `--max-warnings=0` |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:deploy` | `prisma migrate deploy` |

## Core API Overview

| Area | Key Routes | Auth |
| --- | --- | --- |
| Health | `GET /health` | Public |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me` | Register/login public; `/me` requires JWT |
| Settings | `GET/PUT /settings`, `GET /settings/provider-keys`, `PUT /settings/provider-keys`, `DELETE /settings/provider-keys/:provider` | JWT |
| Projects | `POST /projects/index`, `GET /projects`, `GET /projects/:id` | Index requires JWT. List is public (`mine=true` or `ownerId` optional). Get is public for ownerless projects; owned projects return `403` unless the JWT matches the owner |
| Knowledge Graph | `GET /knowledge-graph`, `GET /knowledge-graph?userId=<id>` | Public. `userId` filters resume and conversation-session nodes only; project nodes stay unscoped. The route does **not** default to the current JWT user |
| Resumes | `POST /resumes/ingest`, `GET /resumes`, `GET /resumes/:id`, `POST /resumes/:id/sections/:section/generate`, `POST /resumes/:id/sections/:section/improve`, `PATCH /resumes/:id/sections/:section` | JWT; ownership enforced |
| Conversations | `POST /conversations/session`, `POST /conversations/session/:id/respond`, `GET /conversations/session/:id` | JWT |
| Retrieval | `POST /retrieval/tailor`, `GET /retrieval/tailored` | JWT; `userId` is taken from the token |
| Job Intelligence | `POST /intelligence/job` | JWT; `userId` is taken from the token |
| Profiles | `POST /profiles/developer-report` | JWT; `userId` is taken from the token |
| LLM Catalogs | `GET /llm/models`, `GET /llm/models/:provider`, `GET /llm/ollama/tags` | Public |

Protected write routes overwrite any client-supplied `userId` with `req.user.id`. Do not send `userId` in resume, retrieval, job-intelligence, conversation, or profile request bodies.

See `docs/frontend.md` for payload shapes, `docs/frontendv2.md` for resume-section/profile workflows, `docs/user-context.md` for context aggregation, and `docs/cover-letter.md` for shared JSON parsing.

## Security Notes

- Passwords hashed via bcrypt (`bcryptjs`). Registration requires a password of at least 8 characters.
- JWTs signed with `AUTH_JWT_SECRET`; send in `Authorization: Bearer <token>`.
- Provider keys encrypted using AES-256-GCM with `APP_ENCRYPTION_KEY` before storing. Listing keys never returns the secret; the payload is `{ provider, configured, metadata, ... }`.
- `optionalAuth` runs globally and attaches `req.user` when a valid token is present. Invalid tokens are ignored on public routes. Protected routers still call `authenticate`, which also checks that the user still exists.

## Operational Pitfalls

- **CORS**: browser calls fail unless the frontend origin is listed in `CORS_ALLOWED_ORIGINS`.
- **Saved provider keys vs runtime**: `/settings/provider-keys` encrypts and stores keys, but adapters (`src/adapters/llm/*`) only read env vars. Saving a key in the UI does not make LLM calls succeed.
- **Sparse developer reports**: `POST /profiles/developer-report` is only as useful as ingested resumes, owned indexed projects, and conversation insights. See `docs/user-context.md`.
- **Knowledge-graph `userId`**: omitting it returns an unscoped graph. Passing it still includes **all** projects.
- **Resume ingest**: `resumeText` must be at least 50 characters.
- **Retrieval tailor**: `jobDescription` must be at least 30 characters. `assetType` is `resume | cover_letter | summary`.

## Additional Notes

- All TypeScript imports use explicit `.js` suffixes (NodeNext compatibility).
- Repositories export typed helpers with dedicated `*.types.ts`.
- Prompts for every LLM-driven workflow live in `src/prompts/basePrompts.ts` for consistent output.
