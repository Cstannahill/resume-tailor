# Resume Tailor Frontend

Next.js application for the Experience Studio workspace. It signs users in to the Resume Tailor API, indexes projects, ingests resumes, runs persona coaching, generates tailored assets, and visualizes the knowledge graph built by the backend.

## Tech Stack

- Next.js 16 + React 19 with the App Router
- TypeScript and Tailwind CSS 4
- TanStack Query for server state and request caching
- `next-themes` for light/dark theme state
- Local storage backed JWT session state in `src/contexts/auth-context.tsx`
- PDF/DOCX export helpers in `src/lib/exporters.ts`

## Local Setup

1. Install dependencies from this package:

```bash
npm install
```

2. Configure the API base URL. Next.js reads public browser env vars from `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

If the variable is omitted, `src/lib/constants.ts` defaults to `http://localhost:4000`.

3. Start the frontend and backend in separate terminals:

```bash
npm run dev
```

Open `http://localhost:3000`. The API must also be running for authenticated workspace features to load.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the production app |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Application Structure

```text
src/
  app/                    # App Router pages for workspace, resume, cover letter, settings
  components/
    layout/               # App shell, navigation, auth actions
    modules/              # Feature workbenches wired to API services
    providers/            # Query, theme, auth, and toaster providers
    ui/                   # Shared UI primitives
  contexts/               # Auth context and profile refresh flow
  hooks/                  # Resume draft state helpers
  lib/                    # API client, auth storage, constants, exporters, utilities
  services/               # Thin API wrappers per backend module
  types/                  # Shared frontend request/response types
```

## Runtime Model

- `src/lib/api-client.ts` unwraps successful `{ data }` responses and throws `Error` instances from API error payloads.
- The API client automatically attaches `Authorization: Bearer <token>` when `src/lib/auth-storage.ts` has a saved JWT.
- `AuthProvider` loads cached user data first, then can refresh `/auth/me`; failed profile loads clear local auth state.
- `AppProviders` configures TanStack Query with 60-second stale time, no window-focus refetch, one query retry, and no mutation retries.
- Most feature components are client components because they depend on auth state, browser storage, or mutations.

## Main Workflows

| Page | Source | Backing Services |
| --- | --- | --- |
| Workspace dashboard | `src/app/page.tsx` | Projects, resumes, conversations, retrieval, knowledge graph, LLM catalogs, developer reports |
| Resume Studio | `src/app/resume/page.tsx` | Resume ingestion, section generation/improvement, section persistence |
| Cover Letter Studio | `src/app/cover-letter/page.tsx` | Tailored asset generation plus job intelligence handoff |
| Settings | `src/app/settings/page.tsx` | User defaults and encrypted provider-key management |

Key API wrappers live in `src/services/*.ts`. Keep new backend calls behind these service helpers so components do not duplicate URL construction, auth headers, or response unwrapping.

## Developer Notes

- Public environment variables must start with `NEXT_PUBLIC_`; server-only secrets do not belong in this package.
- JWTs and cached user profiles are stored in `localStorage`, so auth access is client-only and should stay behind `AuthWall` or auth-aware components.
- `NEXT_PUBLIC_API_BASE_URL` must point at an API origin allowed by the backend `CORS_ALLOWED_ORIGINS` setting.
- Service functions expect the backend envelope shape documented in `docs/frontend.md`.
- Resume section workflows and the developer baseline report are documented in `docs/frontendv2.md`.

## Troubleshooting

- `Unauthorized`: sign in again; the frontend clears cached auth state after failed `/auth/me` profile loads.
- Browser CORS error: add the frontend origin, usually `http://localhost:3000`, to the API `CORS_ALLOWED_ORIGINS`.
- Empty dashboard data: create an account, then ingest a resume or index a project. Protected list routes are scoped to the signed-in user.
- Model/provider failures: confirm provider keys in Settings or backend env defaults before retrying generation flows.
