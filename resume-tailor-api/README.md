# Resume Tailor API

Modern Express + TypeScript (ESM) platform that indexes engineering projects, parses resumes, runs persona-based interviews, generates tailored job collateral, and surfaces knowledge graphs/intelligence insights. User-owned workflows are protected by JWT auth, while selected read routes support public discovery or optional auth. Provider keys are encrypted before storage in PostgreSQL via Prisma.

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
| `DATABASE_URL` | PostgreSQL connection string. |
| `DEFAULT_LLM_PROVIDER` | One of `ollama`, `bedrock`, `google`, or `openrouter`. Defaults to `ollama`. |
| `OLLAMA_BASE_URL`, `OLLAMA_API_KEY` | Ollama Cloud config. `OLLAMA_BASE_URL` defaults to `https://ollama.com`. |
| `BEDROCK_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS Bedrock config. Required only when using Bedrock. |
| `GOOGLE_GENAI_API_KEY` | Google GenAI key. Required only when using Google. |
| `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` | OpenRouter config. Required only when using OpenRouter. |
| `AUTH_JWT_SECRET` | Long random string for JWT signing; must be at least 32 characters. |
| `APP_ENCRYPTION_KEY` | Base64-encoded 32-byte key for AES-256-GCM provider-key encryption. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed browser origins. Defaults to `http://localhost:3000`. |

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
| `npm run build`    | Compile TypeScript to `dist`                                |
| `npm run start`    | Run compiled output (after `npm run build`)                 |
| `npm run lint`     | ESLint (TS)                                                 |
| `npm run prisma:*` | Prisma helpers (`migrate`, `studio`, `generate`, `db push`) |

## Core API Overview

| Area | Key Routes | Auth Notes |
| --- | --- | --- |
| Health | `GET /health` | Public. |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me` | Profile routes require JWT. |
| Settings | `GET/PUT /settings`, `GET/PUT/DELETE /settings/provider-keys` | JWT required; provider keys are encrypted at rest. |
| Projects | `POST /projects/index`, `GET /projects`, `GET /projects/:id` | Indexing requires JWT. Listing is public, with optional `mine=true` when authenticated. Owned project details return `403` unless the requester owns them. |
| Knowledge Graph | `GET /knowledge-graph?userId=<id>` | Public read route. Pass `userId` explicitly to scope results. |
| Resumes | `POST /resumes/ingest`, `GET /resumes`, `GET /resumes/:id`, section `generate`/`improve`/`PATCH` routes | JWT required; user ownership is derived from the token. |
| Conversations | `POST /conversations/session`, `POST /conversations/session/:id/respond`, `GET /conversations/session/:id` | JWT required; session ownership is token-scoped. |
| Retrieval | `POST /retrieval/tailor`, `GET /retrieval/tailored` | JWT required; `userId` is derived from the token. |
| Job Intelligence | `POST /intelligence/job` | JWT required; portfolio matching is token-scoped. |
| Developer Profile | `POST /profiles/developer-report` | JWT required; gathers the current user's resumes, projects, and persona insights. |
| LLM Catalogs | `GET /llm/models`, `GET /llm/models/:provider`, `GET /llm/ollama/tags` | Public catalog endpoints. |

See `docs/frontend.md` for payload shapes and sample responses, and `docs/frontendv2.md` for resume-section editing and developer-report flows.

## Security Notes

- Passwords hashed via bcrypt (`bcryptjs`).
- JWTs signed with `AUTH_JWT_SECRET`; send in `Authorization` header.
- Provider keys encrypted using AES-256-GCM with `APP_ENCRYPTION_KEY` before storing.
- Optional auth middleware attaches `req.user` for read-only routes; protected routers enforce `authenticate`.

## Operational Notes

- Keep `CORS_ALLOWED_ORIGINS` aligned with each frontend origin; browser requests fail before reaching route handlers when the origin is missing.
- Resume, retrieval, job-intelligence, conversation, profile, and settings requests ignore any client-supplied `userId`; they derive ownership from `req.user.id`.
- `GET /knowledge-graph` does not infer JWT scope. Use `?userId=<id>` when the caller needs a user-specific graph.
- Local project indexing requires the API process to read the provided filesystem path. GitHub indexing clones from the provided `repoUrl` and optional `branch`.

## Additional Notes

- All TypeScript imports use explicit `.js` suffixes (NodeNext compatibility).
- Repositories export typed helpers with dedicated `*.types.ts`.
- Prompts for every LLM-driven workflow live in `src/prompts/basePrompts.ts` for consistent output.
