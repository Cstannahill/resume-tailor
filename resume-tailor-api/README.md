# Experience API

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
  - Persona conversations with adaptive questioning, evaluation, and layered insights.
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
  repositories/              # Prisma data access helpers
  routes/                    # Express routers per module
  app.ts                     # Express bootstrap
  server.ts                  # Entrypoint
```

## Environment Variables

Copy `.env.example` → `.env` and fill:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `DEFAULT_LLM_PROVIDER` | `ollama | bedrock | google | openrouter` |
| `OLLAMA_BASE_URL`, `OLLAMA_API_KEY` | Ollama Cloud config |
| `BEDROCK_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS Bedrock creds |
| `GOOGLE_GENAI_API_KEY` | Google GenAI key |
| `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` | OpenRouter config |
| `AUTH_JWT_SECRET` | Long random string for JWT signing |
| `APP_ENCRYPTION_KEY` | Base64-encoded 32-byte key for AES-256-GCM |

## Getting Started

1. Install deps: `npm install` (or `pnpm install`).
2. Copy `.env.example` → `.env`, fill values above.
3. Generate Prisma client: `npx prisma generate`
4. Apply migrations (creates tables/users/etc.): `npx prisma migrate dev`
5. Start dev server: `npm run dev`

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Express via `tsx watch` (ESM hot reloading) |
| `npm run build` | Type-check (tsc, no emit) |
| `npm run start` | Run compiled output (after `npm run build`) |
| `npm run lint` | ESLint (TS) |
| `npm run prisma:*` | Prisma helpers (`migrate`, `studio`, `generate`, `db push`) |

## Core API Overview

| Area | Key Routes (all JSON, `Authorization: Bearer <token>` required unless noted) |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me` |
| Settings | `GET/PUT /settings`, `GET/PUT/DELETE /settings/provider-keys` |
| Projects | `POST /projects/index`, `GET /projects`, `GET /projects/:id` |
| Knowledge Graph | `GET /knowledge-graph?userId=<id>` |
| Resumes | `POST /resumes/ingest`, `GET /resumes`, `GET /resumes/:id` |
| Conversations | `POST /conversations/session`, `POST /conversations/session/:id/respond`, `GET /conversations/session/:id` |
| Retrieval | `POST /retrieval/tailor`, `GET /retrieval/tailored` |
| Job Intelligence | `POST /intelligence/job` |
| LLM Catalogs | `GET /llm/models`, `GET /llm/models/:provider`, `GET /llm/ollama/tags` |

See `frontend.MD` for payload shapes and sample responses.

## Security Notes

- Passwords hashed via bcrypt (`bcryptjs`).
- JWTs signed with `AUTH_JWT_SECRET`; send in `Authorization` header.
- Provider keys encrypted using AES-256-GCM with `APP_ENCRYPTION_KEY` before storing.
- Optional auth middleware attaches `req.user` for read-only routes; protected routers enforce `authenticate`.

## Additional Notes

- All TypeScript imports use explicit `.js` suffixes (NodeNext compatibility).
- Repositories export typed helpers with dedicated `*.types.ts`.
- Prompts for every LLM-driven workflow live in `src/prompts/basePrompts.ts` for consistent output.
