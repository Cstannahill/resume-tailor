# Resume Tailor Frontend

Next.js workspace for the Resume Tailor platform. The app lets authenticated users index projects, ingest and edit resumes, run persona coaching sessions, generate tailored collateral, inspect knowledge graphs, and manage LLM provider settings against `resume-tailor-api`.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 with local UI primitives in `src/components/ui`
- TanStack Query for client-side API caching
- `fetch` wrapper in `src/lib/api-client.ts` for API responses and auth headers
- `next-themes` and `sonner` for theme state and notifications

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure the API URL. Next.js reads public browser variables from `.env.local`:

```bash
printf 'NEXT_PUBLIC_API_BASE_URL=http://localhost:4000\n' > .env.local
```

If omitted, `src/lib/constants.ts` defaults to `http://localhost:4000`.

3. Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`. The backend must be running with `CORS_ALLOWED_ORIGINS` including the frontend origin.

## App Routes

| Route | Purpose |
| --- | --- |
| `/` | Auth panel plus the main workspace: project indexing, project list, resume insights, tailored assets, conversations, knowledge graph, LLM catalog, and developer report. |
| `/resume` | Resume ingestion, section generation/improvement, section persistence, and export-focused editing. |
| `/cover-letter` | Cover-letter workbench with job-intelligence analysis feeding suggested resume/project context. |
| `/settings` | Authenticated profile settings, default provider preferences, and encrypted provider-key management. |

`src/components/layout/app-shell.tsx` owns the global navigation. Auth-only pages and panels are wrapped with `AuthWall`, which shows the auth form while the user is unauthenticated.

## API Client Contract

All service modules call `apiRequest<T>()` from `src/lib/api-client.ts`.

- Base URL: `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://localhost:4000`.
- Success shape: backend responses are unwrapped from `{ "data": T }`.
- Error shape: API errors prefer `{ "error": { "message": string } }`; non-JSON failures fall back to `response.statusText`.
- Auth: after login/register, `AuthProvider` stores the JWT under `experience:auth-token` in `localStorage`; `apiRequest` attaches `Authorization: Bearer <token>` when present.
- A `401` response throws an `Error` with `code = 401`; individual components should handle this by prompting re-authentication or clearing local state.

Service-to-route mapping lives in `src/services`:

| Service | Backend routes |
| --- | --- |
| `auth.ts` | `/auth/register`, `/auth/login`, `/auth/me` |
| `settings.ts` | `/settings`, `/settings/provider-keys` |
| `projects.ts` | `/projects/index`, `/projects` |
| `resumes.ts` | `/resumes/ingest`, `/resumes/:id`, `/resumes/:id/sections/:section/*` |
| `conversations.ts` | `/conversations/session`, `/conversations/session/:id` |
| `retrieval.ts` | `/retrieval/tailor`, `/retrieval/tailored` |
| `intelligence.ts` | `/intelligence/job` |
| `knowledge-graph.ts` | `/knowledge-graph` |
| `llm.ts` | `/llm/models`, `/llm/ollama/tags` |
| `profile.ts` | `/profiles/developer-report` |

## Common Workflows

### Sign In and Seed Auth State

1. Register or log in through `AuthPanel`.
2. `AuthProvider` stores the token and user profile in `localStorage`.
3. `AuthWall` renders authenticated panels once `getProfile()` succeeds or a cached user is available.
4. Use the Settings page to update defaults or provider keys before running LLM-backed workflows.

### Tailor Collateral

1. Index at least one project from the workspace or GitHub.
2. Ingest a resume on `/resume`.
3. Paste a job description on `/cover-letter`.
4. Let job intelligence choose matching project and resume IDs, then generate a cover-letter asset.

### Add a New API-backed Panel

1. Add shared request/response types in `src/types`.
2. Add a service function in `src/services` that calls `apiRequest`.
3. Use `useQuery` for reads and mutation hooks for writes, matching `AppProviders` retry defaults.
4. Gate protected workflows with `AuthWall` or `useAuth`.
5. Keep route examples aligned with `resume-tailor-api/docs/frontend.md`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js in development mode. |
| `npm run build` | Build the production app. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |

## Troubleshooting

- **Requests fail with CORS errors**: add the frontend URL to the API `CORS_ALLOWED_ORIGINS` value and restart the API.
- **Everything shows the auth form after login**: check that `/auth/me` returns `200` and that the token exists in browser `localStorage` as `experience:auth-token`.
- **Protected panels return `Unauthorized`**: the token may be expired or signed with a different `AUTH_JWT_SECRET`; sign out and sign in again after API env changes.
- **LLM-backed actions fail**: set provider keys in Settings or configure backend provider env variables. The frontend only sends provider selection and request context.
- **Unexpected empty data**: many list views use TanStack Query caching with `staleTime: 60_000`; invalidate or refresh after creating new records.
