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
  - Resume ingestion -> structured insights + skill extraction.
  - Resume-section generation, improvement, and PATCH updates for the builder UI.
  - Persona conversations with adaptive questioning, evaluation, and layered insights.
- **Developer Profile**
  - Developer baseline report that summarizes resume, indexed project, persona, and insight evidence.
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
    projects/                # Project indexing
    resumes/
    conversations/
    profile/                 # User-context collection + developer report
    retrieval/
    intelligence/            # Job description analyzer
    knowledgeGraph/          # Project/resume/persona graph assembly
    llm/                     # Public model catalog endpoints
  prompts/                   # Shared prompt builders for LLM workflows
  repositories/              # Prisma data access helpers
  routes/                    # Express routers per module
  utils/                     # JWT, encryption, async, and JSON parsing helpers
  app.ts                     # Express bootstrap
  server.ts                  # Entrypoint
```

## Environment Variables

Copy `.env.example` → `.env` and fill:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. |
| `DEFAULT_LLM_PROVIDER` | Optional default provider: `ollama`, `bedrock`, `google`, or `openrouter` (defaults to `ollama`). |
| `OLLAMA_BASE_URL`, `OLLAMA_API_KEY` | Ollama Cloud config. `OLLAMA_BASE_URL` defaults to `https://ollama.com`. |
| `BEDROCK_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS Bedrock credentials. |
| `GOOGLE_GENAI_API_KEY` | Google GenAI key. |
| `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` | OpenRouter config. |
| `AUTH_JWT_SECRET` | Long random string for JWT signing; must be at least 32 characters. |
| `APP_ENCRYPTION_KEY` | Base64-encoded 32-byte key for AES-256-GCM provider-key encryption. |
| `CORS_ALLOWED_ORIGINS` | Optional comma-separated frontend origins; defaults to `http://localhost:3000`. |

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
| `npm run build`    | Compile TypeScript into `dist` with `tsc`                    |
| `npm run start`    | Run compiled output (after `npm run build`)                 |
| `npm run lint`     | ESLint (TS)                                                 |
| `npm run prisma:*` | Prisma helpers (`migrate`, `studio`, `generate`, `db push`) |

## Core API Overview

| Area | Key Routes | Auth notes |
| --- | --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me` | Register/login are public; profile read/update requires JWT. |
| Settings | `GET/PUT /settings`, `GET/PUT/DELETE /settings/provider-keys` | JWT required; provider keys are encrypted before storage. |
| Projects | `POST /projects/index`, `GET /projects`, `GET /projects/:id` | Indexing requires JWT. List/get are public, but owned project records return `403` unless requested by their owner. |
| Knowledge Graph | `GET /knowledge-graph?userId=<id>` | Public. `userId` filters resumes and conversation sessions only; projects are included globally. |
| Resumes | `POST /resumes/ingest`, `GET /resumes`, `GET /resumes/:id`, `POST /resumes/:id/sections/:section/generate`, `POST /resumes/:id/sections/:section/improve`, `PATCH /resumes/:id/sections/:section` | JWT required; `:section` is `summary`, `skills`, `experiences`, `education`, or `contact`. |
| Conversations | `POST /conversations/session`, `POST /conversations/session/:id/respond`, `GET /conversations/session/:id` | JWT required. |
| Retrieval | `POST /retrieval/tailor`, `GET /retrieval/tailored` | JWT required; `assetType` is `resume`, `cover_letter`, or `summary` (default). |
| Job Intelligence | `POST /intelligence/job` | JWT required. |
| Profile | `POST /profiles/developer-report` | JWT required; builds a developer baseline report from collected user context. |
| LLM Catalogs | `GET /llm/models`, `GET /llm/models/:provider`, `GET /llm/ollama/tags` | Public catalog routes. Provider catalogs cache for 10 minutes; Ollama tags cache for 5 minutes. |

See `docs/frontend.md` for payload shapes and sample responses. See `docs/frontendv2.md` for resume-section editing and developer-report workflows.

## Shared User Context

`src/modules/profile/userContext.service.ts` centralizes the platform's "what do we know about this user?" snapshot:

- latest resume summary, skills, and up to three experience highlights;
- up to three owned project summaries/highlights;
- conversation-derived persona insights;
- other stored insight records for the user.

The developer report endpoint and resume-section generate/improve endpoints both use this snapshot. Frontends should send only the user's immediate edits or job-specific deltas; the API enriches LLM prompts with stored context server-side.

## Response Shape Notes

- Successful API responses use `{ "data": ... }`; validation/errors use `{ "error": { "message": string, "details"?: unknown } }`.
- `POST /resumes/ingest` returns `{ record, insight }` so the UI can display the fresh parse immediately.
- `GET /resumes` and `GET /resumes/:id` return persisted `Resume` records with flat Prisma fields such as `extractedSummary`, `skills`, `experience`, `education`, and `contact`; they do not rewrap the record in an `insight` object.
- Protected controllers derive `userId` from `req.user.id`. Do not accept client-supplied `userId` for protected write workflows.

## Security Notes

- Passwords hashed via bcrypt (`bcryptjs`).
- JWTs signed with `AUTH_JWT_SECRET`; send in `Authorization` header.
- Provider keys encrypted using AES-256-GCM with `APP_ENCRYPTION_KEY` before storing.
- Optional auth middleware attaches `req.user` for read-only routes; protected routers enforce `authenticate`.

## Additional Notes

- All TypeScript imports use explicit `.js` suffixes (NodeNext compatibility).
- Repositories export typed helpers with dedicated `*.types.ts`.
- Prompts for every LLM-driven workflow live in `src/prompts/basePrompts.ts` for consistent output.
- `src/utils/json.ts` strips common Markdown fences/padding before JSON parsing for LLM responses. Retrieval, resume, conversation, and job-intelligence services use it before falling back to unstructured text paths.
