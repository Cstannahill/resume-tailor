# Resume Tailor API

Modern Express + TypeScript (ESM) platform that indexes engineering projects, parses resumes, runs persona-based interviews, generates tailored job collateral, and surfaces knowledge graphs/intelligence insights. Protected workflows use JWT auth, PostgreSQL via Prisma, and server-side LLM provider configuration.

## Feature Highlights

- **Auth & Settings**
  - Email + password registration/login (`/auth/*`) issuing JWTs.
  - User profile updates plus persisted settings (`/settings`) and encrypted provider-key storage.
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
    settings/                # Persisted settings & provider-key storage
    projects/                # Project indexing from GitHub/local paths
    knowledgeGraph/          # Project/resume/persona graph assembly
    profile/                 # Developer baseline report context
    llm/                     # Model catalog endpoints
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

| Variable                                                       | Description                                         |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `PORT`                                                         | API port, defaults to `4000`                        |
| `DATABASE_URL`                                                 | PostgreSQL connection string                        |
| `DEFAULT_LLM_PROVIDER`                                         | One of `ollama`, `bedrock`, `google`, `openrouter`  |
| `OLLAMA_BASE_URL`, `OLLAMA_API_KEY`                            | Ollama Cloud runtime config                         |
| `BEDROCK_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS Bedrock runtime config                          |
| `GOOGLE_GENAI_API_KEY`                                         | Google GenAI runtime config                         |
| `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`                    | OpenRouter runtime config                           |
| `AUTH_JWT_SECRET`                                              | Long random string for JWT signing, minimum 32 chars |
| `APP_ENCRYPTION_KEY`                                           | Base64-encoded 32-byte key for AES-256-GCM          |
| `CORS_ALLOWED_ORIGINS`                                         | Comma-separated allowed frontend origins            |

Generate a valid encryption key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

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
| `npm run build`    | Compile TypeScript to `dist/`                               |
| `npm run start`    | Run compiled output (after `npm run build`)                 |
| `npm run lint`     | ESLint (TS)                                                 |
| `npm run prisma:*` | Prisma helpers (`migrate`, `deploy`, `studio`, `generate`)  |

## Core API Overview

| Area             | Key Routes (all JSON, `Authorization: Bearer <token>` required unless noted)                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Health           | `GET /health` (public)                                                                                               |
| Auth             | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me`                                                        |
| Settings         | `GET/PUT /settings`, `GET/PUT/DELETE /settings/provider-keys`                                                        |
| Projects         | `POST /projects/index`, `GET /projects` (public with optional filters), `GET /projects/:id` (optional auth)          |
| Knowledge Graph  | `GET /knowledge-graph?userId=<id>` (public; query param controls user scoping)                                       |
| Resumes          | `POST /resumes/ingest`, `GET /resumes`, `GET /resumes/:id`, section generate/improve/update routes                   |
| Conversations    | `POST /conversations/session`, `POST /conversations/session/:id/respond`, `GET /conversations/session/:id`           |
| Retrieval        | `POST /retrieval/tailor`, `GET /retrieval/tailored`                                                                  |
| Job Intelligence | `POST /intelligence/job`                                                                                             |
| Profiles         | `POST /profiles/developer-report`                                                                                    |
| LLM Catalogs     | `GET /llm/models`, `GET /llm/models/:provider`, `GET /llm/ollama/tags`                                               |

See `docs/frontend.md` for payload shapes and sample responses.

## LLM Runtime And Settings

LLM generation and model-catalog calls are configured from server environment variables. `llm.factory.ts` resolves an explicit request `llmProvider` first, then falls back to `DEFAULT_LLM_PROVIDER`; adapters read their own env values such as `OLLAMA_API_KEY`, `GOOGLE_GENAI_API_KEY`, or AWS credentials.

The `/settings` routes persist user preferences and encrypted provider keys, but those stored keys are not currently passed into the LLM adapters. Treat them as stored account data until adapter-level key resolution is implemented. Client payloads must use the API field names:

```json
{
  "defaultLlmProvider": "ollama",
  "notificationPrefs": {
    "jobMatches": true
  }
}
```

Provider keys are stored with `PUT /settings/provider-keys` using `{ "provider": "ollama", "apiKey": "..." }`; deleting one returns `204` with an empty body.

## Operations Runbook

- Run `npm run prisma:deploy` in deploy flows after `npm run prisma:generate`; use `npm run prisma:migrate` only for local development migrations.
- Set `CORS_ALLOWED_ORIGINS` to every deployed frontend origin. When omitted, only `http://localhost:3000` is allowed.
- If LLM requests fail after saving keys in Settings, verify server env vars first. Runtime adapters do not decrypt or consume saved user keys yet.
- For local project indexing, `POST /projects/index` with `{ "source": { "kind": "local", "path": "..." } }` reads paths from the API server filesystem, not the browser machine.

## Security Notes

- Passwords hashed via bcrypt (`bcryptjs`).
- JWTs signed with `AUTH_JWT_SECRET`; send in `Authorization` header.
- Provider keys encrypted using AES-256-GCM with `APP_ENCRYPTION_KEY` before storing. The key must decode to exactly 32 bytes.
- Optional auth middleware attaches `req.user` for read-only routes; protected routers enforce `authenticate`.

## Additional Notes

- All TypeScript imports use explicit `.js` suffixes (NodeNext compatibility).
- Repositories export typed helpers with dedicated `*.types.ts`.
- Prompts for every LLM-driven workflow live in `src/prompts/basePrompts.ts` for consistent output.
