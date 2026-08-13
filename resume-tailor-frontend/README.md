# Resume Tailor Frontend

Next.js App Router frontend for the Resume Tailor workspace. It signs users in, stores the API token in browser storage, and calls the Express API in `../resume-tailor-api` for project indexing, resume editing, persona coaching, tailored collateral, knowledge graphs, LLM catalogs, settings, and developer baseline reports.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Point the app at the API (this package has no `.env.example`):

```bash
printf "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000\n" > .env.local
```

3. Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`. Keep the API running on that base URL. If `NEXT_PUBLIC_API_BASE_URL` is omitted, `src/lib/constants.ts` falls back to `http://localhost:4000`.

The API `CORS_ALLOWED_ORIGINS` must include the frontend origin (`http://localhost:3000` locally).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build the production app |
| `npm run start` | Serve a production build |
| `npm run lint` | Run ESLint |

## App Routes

| Route | Purpose |
| --- | --- |
| `/` | Auth-gated dashboard: project indexing/listing, resume insights, persona coach, tailored assets, knowledge graph, LLM catalogs, developer report |
| `/resume` | Resume ingest and section-editing workspace |
| `/cover-letter` | Job intelligence plus cover-letter tailoring/export |
| `/settings` | Auth-gated settings and provider-key management |

## Architecture

```text
src/
  app/                         # App Router pages
  components/modules/          # Feature panels (auth, projects, resumes, retrieval, graph, LLM, profile, settings)
  components/ui/               # Shared UI primitives
  contexts/auth-context.tsx    # Login/register/logout and profile refresh
  lib/api-client.ts            # Base URL, JSON unwrapping, bearer token
  lib/auth-storage.ts          # localStorage keys for token + cached user
  lib/exporters.ts             # Client-side PDF/DOCX export
  services/                    # Typed API calls per backend module
  types/                       # Shared request/response types
```

- `src/components/providers/app-providers.tsx` wires React Query, theme, auth, and toasts. Queries default to a 60s stale time, no refetch on window focus, and one retry.
- `AuthWall` on the dashboard shows `AuthPanel` until a token exists.
- Tokens are stored as `experience:auth-token`; cached profiles as `experience:auth-user`.

## API and Auth Notes

- `apiRequest` attaches `Authorization: Bearer <token>` when a token exists, unwraps successful `{ data }` responses, and throws the API `error.message` for non-2xx JSON.
- A 401 from `apiRequest` is surfaced as `Unauthorized`; profile load then clears stored auth state.
- Most write workflows derive the user from the JWT. Do not send `userId` in resume, retrieval, job-intelligence, or developer-report bodies.
- Per-request `llmProvider` overrides the API `DEFAULT_LLM_PROVIDER`. Settings field names are `defaultLlmProvider` and `notificationPrefs`.
- Saved provider keys are encrypted by the API, but runtime LLM adapters currently read **server environment variables**, not those stored keys.

## Reference Docs

- `docs/frontend.md` — canonical payload shapes and route behavior.
- `docs/frontendv2.md` — resume-section editing, context enrichment, developer reports.
- Backend setup: `../resume-tailor-api/README.md`.
- User-context pipeline: `../resume-tailor-api/docs/user-context.md`.

## Troubleshooting

- **401 Unauthorized**: clear `experience:auth-token` and `experience:auth-user` from browser storage, then sign in again.
- **CORS / network errors**: confirm the API is running and `resume-tailor-api/.env` lists this origin in `CORS_ALLOWED_ORIGINS`.
- **Settings saved but LLM calls still fail**: check API env vars (`OLLAMA_API_KEY`, `GOOGLE_GENAI_API_KEY`, AWS keys, `OPENROUTER_API_KEY`). UI-saved keys are not used by adapters yet.
- **API URL changes not reflected**: restart `npm run dev` after editing `.env.local`; Next.js reads `NEXT_PUBLIC_*` at startup/build time.
- **Slow AI actions**: indexing, resume generation, job intelligence, and developer reports call LLM providers and can take several seconds; keep loading states visible.
