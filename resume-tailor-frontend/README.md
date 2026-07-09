# Resume Tailor Frontend

Next.js App Router frontend for the Resume Tailor platform. The app signs users in, stores the API token in browser storage, and calls the Express API for project indexing, resume editing, persona coaching, tailored collateral, knowledge graphs, LLM catalogs, settings, and developer baseline reports.

## Local Setup

```bash
npm install
printf "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000\n" > .env.local
npm run dev
```

Open `http://localhost:3000`. Keep the API running on the URL configured by `NEXT_PUBLIC_API_BASE_URL`; if the variable is omitted, `src/lib/constants.ts` falls back to `http://localhost:4000`.

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Build the production app. |
| `npm run start` | Serve a production build. |
| `npm run lint` | Run ESLint. |

## App Structure

```text
src/
  app/                         # App Router pages: dashboard, resume, cover-letter, settings
  components/modules/          # Feature panels for auth, projects, resumes, retrieval, graph, LLM, profile
  components/ui/               # Shared UI primitives
  contexts/auth-context.tsx    # Auth state, profile refresh, login/register/logout
  lib/api-client.ts            # Fetch wrapper for API base URL, JSON unwrapping, bearer token
  services/                    # Typed API calls per backend module
  types/                       # Shared frontend request/response types
```

The dashboard (`src/app/page.tsx`) is gated by `AuthWall` and composes the main workflows: project indexing/listing, resume insights, tailored assets, persona coaching, knowledge graph, LLM catalogs, and the developer baseline report.

## API and Auth Notes

- `apiRequest` reads the token from `localStorage`, attaches `Authorization: Bearer <token>` when present, unwraps successful `{ data }` responses, and throws API error messages for non-2xx responses.
- Register/login calls store both token and user profile through `src/contexts/auth-context.tsx`; a 401 clears cached auth state on the next profile load.
- Most write workflows derive the user from the JWT on the API. Do not send `userId` from forms unless a documented public read endpoint explicitly accepts it.
- The developer baseline card calls `POST /profiles/developer-report` with an optional `llmProvider` and displays the structured report returned by the API.

## Reference Docs

- `docs/frontend.md` mirrors the canonical API integration notes.
- `docs/frontendv2.md` covers resume-section editing, shared user-context enrichment, and developer baseline reports.
- Backend setup and route coverage live in `../resume-tailor-api/README.md`.

## Troubleshooting

- **401 Unauthorized**: sign in again; the frontend stores tokens in browser `localStorage`.
- **Network/CORS errors**: confirm the API is running and `resume-tailor-api/.env` includes the frontend origin in `CORS_ALLOWED_ORIGINS`.
- **Unexpected API URL**: update `.env.local`, then restart `npm run dev` so Next.js reloads `NEXT_PUBLIC_API_BASE_URL`.
- **Slow AI actions**: project indexing, resume generation, job intelligence, and developer reports call LLM providers and can take several seconds; keep loading states visible in feature panels.
