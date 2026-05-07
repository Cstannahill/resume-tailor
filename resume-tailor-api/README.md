# Resume Tailor API

Modern Express + TypeScript (ESM) platform that indexes engineering projects, parses resumes, runs persona-based interviews, generates tailored job collateral, and surfaces knowledge graphs/intelligence insights. Authenticated workflows use JWT auth, user-specific settings, and encrypted provider keys on PostgreSQL via Prisma.

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

| Variable                                                       | Description                                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                                                 | PostgreSQL connection string                                                |
| `DEFAULT_LLM_PROVIDER`                                         | Optional default provider: `ollama`, `bedrock`, `google`, or `openrouter`   |
| `OLLAMA_BASE_URL`, `OLLAMA_API_KEY`                            | Ollama Cloud config; tags lookup requires `OLLAMA_API_KEY`                  |
| `BEDROCK_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS Bedrock config                                                          |
| `GOOGLE_GENAI_API_KEY`                                         | Google GenAI key                                                            |
| `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`                    | OpenRouter config                                                           |
| `AUTH_JWT_SECRET`                                              | JWT signing secret; must be at least 32 characters                          |
| `APP_ENCRYPTION_KEY`                                           | Base64-encoded 32-byte key for AES-256-GCM provider-key storage             |
| `CORS_ALLOWED_ORIGINS`                                         | Optional comma-separated frontend origins; defaults to `http://localhost:3000` |

## Getting Started

1. Install deps: `npm install` (or `pnpm install`).
2. Copy `.env.example` → `.env`, fill values above.
3. Generate Prisma client: `npx prisma generate`
4. Apply migrations (creates tables/users/etc.): `npx prisma migrate dev`
5. Start dev server: `npm run dev`

## Scripts

| Script             | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `npm run dev`      | Start Express via `tsx watch` (ESM hot reloading)           |
| `npm run build`    | Compile TypeScript into `dist`                              |
| `npm run start`    | Run compiled output (after `npm run build`)                 |
| `npm run lint`     | ESLint (TS)                                                 |
| `npm run prisma:migrate` | Run Prisma migrations in development                  |
| `npm run prisma:generate` | Generate Prisma client                                 |
| `npm run prisma:studio` | Open Prisma Studio                                       |
| `npm run prisma:deploy` | Apply migrations in deploy environments                  |

## Core API Overview

| Area             | Key Routes (all JSON)                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Health           | `GET /health`                                                                                              |
| Auth             | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me`                                              |
| Settings         | `GET/PUT /settings`, `GET/PUT/DELETE /settings/provider-keys`                                              |
| Projects         | `POST /projects/index`, `GET /projects`, `GET /projects/:id`                                               |
| Knowledge Graph  | `GET /knowledge-graph?userId=<id>`                                                                         |
| Resumes          | `POST /resumes/ingest`, `GET /resumes`, `GET /resumes/:id`, section generate/improve/update routes         |
| Conversations    | `POST /conversations/session`, `POST /conversations/session/:id/respond`, `GET /conversations/session/:id` |
| Retrieval        | `POST /retrieval/tailor`, `GET /retrieval/tailored`                                                        |
| Job Intelligence | `POST /intelligence/job`                                                                                   |
| Developer Profile | `POST /profiles/developer-report`                                                                         |
| LLM Catalogs     | `GET /llm/models`, `GET /llm/models/:provider`, `GET /llm/ollama/tags`                                     |

See `docs/frontend.md` for payload shapes and sample responses, and `docs/frontendv2.md` for resume-section editing details.

## Authentication and Scoping

Most write routes require `Authorization: Bearer <token>` and derive `userId` from the JWT. Do not send `userId` in request bodies for resume ingestion, job intelligence, retrieval, or developer reports; the server overwrites those values with `req.user.id`.

Routes that can be called without a valid JWT:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /llm/models`, `GET /llm/models/:provider`, `GET /llm/ollama/tags`
- `GET /projects`; add `mine=true` with a valid bearer token to restrict to the current user, or use `ownerId=<uuid>` explicitly
- `GET /projects/:id` for unowned projects; owned projects return `403` unless the bearer token belongs to the owner
- `GET /knowledge-graph`; `userId=<uuid>` filters resumes and conversation sessions, but projects are currently loaded globally

## Security Notes

- Passwords hashed via bcrypt (`bcryptjs`).
- JWTs signed with `AUTH_JWT_SECRET`; send in `Authorization` header.
- Provider keys encrypted using AES-256-GCM with `APP_ENCRYPTION_KEY` before storing.
- Optional auth middleware attaches `req.user` for read-only routes; protected routers enforce `authenticate`.

## Troubleshooting

- **CORS failure from the frontend**: set `CORS_ALLOWED_ORIGINS` to the exact frontend origin, for example `http://localhost:3000`.
- **Env validation fails on boot**: ensure `DATABASE_URL`, `AUTH_JWT_SECRET` (32+ characters), and `APP_ENCRYPTION_KEY` are present.
- **Ollama tags fail**: `GET /llm/ollama/tags` calls Ollama Cloud and requires `OLLAMA_API_KEY`.
- **Prisma client errors after schema changes**: run `npm run prisma:generate`; use `npm run prisma:migrate` for local migrations and `npm run prisma:deploy` in deploy flows.

## Additional Notes

- All TypeScript imports use explicit `.js` suffixes (NodeNext compatibility).
- Repositories export typed helpers with dedicated `*.types.ts`.
- Prompts for every LLM-driven workflow live in `src/prompts/basePrompts.ts` for consistent output.
