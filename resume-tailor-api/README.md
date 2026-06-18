# Resume Tailor API

Modern Express + TypeScript (ESM) platform that indexes engineering projects, parses resumes, runs persona-based interviews, generates tailored job collateral, and surfaces knowledge graphs/intelligence insights. Mutating and user-owned workflows use JWT auth, while selected read routes support public or optionally scoped access. User settings and provider keys are stored in PostgreSQL via Prisma, with provider keys encrypted at rest.

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
    profile/                 # Developer baseline reports
  repositories/              # Prisma data access helpers
  routes/                    # Express routers per module
  app.ts                     # Express bootstrap
  server.ts                  # Entrypoint
```

## Environment Variables

Copy `.env.example` → `.env` and fill:

| Variable | Description |
| --- | --- |
| `PORT` | HTTP port, default `4000`. |
| `NODE_ENV` | `development`, `production`, or `test`. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `DEFAULT_LLM_PROVIDER` | One of `ollama`, `bedrock`, `google`, or `openrouter`; defaults to `ollama`. |
| `OLLAMA_BASE_URL`, `OLLAMA_API_KEY` | Ollama Cloud endpoint and optional key. |
| `BEDROCK_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS Bedrock region and credentials. |
| `GOOGLE_GENAI_API_KEY` | Google GenAI key. |
| `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` | OpenRouter key and optional API base URL. |
| `AUTH_JWT_SECRET` | JWT signing secret; must be at least 32 characters. |
| `APP_ENCRYPTION_KEY` | Base64-encoded 32-byte key for AES-256-GCM provider-key encryption. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS; defaults to `http://localhost:3000`. |

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
| `npm run start`    | Run compiled output from `dist/server.js`                   |
| `npm run lint`     | ESLint (TS)                                                 |
| `npm run prisma:*` | Prisma helpers (`migrate`, `studio`, `generate`, `db push`) |

## Core API Overview

| Area | Key routes |
| --- | --- |
| Health | `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me` |
| Settings | `GET/PUT /settings`, `GET/PUT/DELETE /settings/provider-keys` |
| Projects | `POST /projects/index`, `GET /projects`, `GET /projects/:id` |
| Knowledge Graph | `GET /knowledge-graph`, `GET /knowledge-graph?userId=<id>` |
| Resumes | `POST /resumes/ingest`, `GET /resumes`, `GET /resumes/:id`, `POST /resumes/:id/sections/:section/generate`, `POST /resumes/:id/sections/:section/improve`, `PATCH /resumes/:id/sections/:section` |
| Conversations | `POST /conversations/session`, `POST /conversations/session/:id/respond`, `GET /conversations/session/:id` |
| Retrieval | `POST /retrieval/tailor`, `GET /retrieval/tailored` |
| Job Intelligence | `POST /intelligence/job` |
| Profile | `POST /profiles/developer-report` |
| LLM Catalogs | `GET /llm/models`, `GET /llm/models/:provider`, `GET /llm/ollama/tags` |

All routes accept and return JSON. Protected routes require `Authorization: Bearer <token>`. `GET /projects` is public with optional `search`, `technology`, `ownerId`, or authenticated `mine=true` filters; `GET /projects/:id` is public only for unowned projects and returns `403` for owned projects when the JWT owner does not match. `GET /knowledge-graph` is public and only scopes by user when `userId` is explicitly supplied.

See `docs/frontend.md` for payload shapes and sample responses.

## Security Notes

- Passwords hashed via bcrypt (`bcryptjs`).
- JWTs signed with `AUTH_JWT_SECRET`; send in `Authorization` header.
- Provider keys encrypted using AES-256-GCM with `APP_ENCRYPTION_KEY` before storing.
- Optional auth middleware attaches `req.user` for read-only routes; protected routers enforce `authenticate`.

## Additional Notes

- All TypeScript imports use explicit `.js` suffixes (NodeNext compatibility).
- Repositories export typed helpers with dedicated `*.types.ts`.
- Prompts for every LLM-driven workflow live in `src/prompts/basePrompts.ts` for consistent output.
