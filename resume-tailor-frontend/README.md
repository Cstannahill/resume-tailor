# Resume Tailor Frontend

Next.js workspace for indexing projects, ingesting resumes, running persona coaching, analyzing job descriptions, and generating tailored resume or cover-letter collateral through the Resume Tailor API.

## Stack

- Next.js `16` App Router with React `19` and TypeScript.
- Tailwind CSS `4`, Radix UI primitives, `lucide-react`, and `sonner` toasts.
- TanStack React Query for server state.
- `react-hook-form` plus `zod` for client-side form validation.
- Client-side PDF/DOCX export through dynamic `jspdf` and `docx` imports.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the backend API from `../resume-tailor-api` and make sure its database migrations have run.

3. Create a local environment file:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

`NEXT_PUBLIC_API_BASE_URL` is optional in development; the app falls back to `http://localhost:4000` in `src/lib/constants.ts`.

4. Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Build the production app. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |

## App Routes

Routes live under `src/app` and are rendered inside `AppShell`.

| Route | Purpose |
| --- | --- |
| `/` | Authenticated workspace dashboard for project indexing, project lists, resume insights, tailored assets, persona coaching, knowledge graph, LLM model catalogs, and developer reports. |
| `/resume` | Resume ingestion, resume builder, section generation/improvement, and export workflow. |
| `/cover-letter` | Job intelligence analysis plus cover-letter generation and export. |
| `/settings` | Authenticated profile defaults, notification preferences, and encrypted provider-key management. |

`Settings` is hidden from navigation until the user is authenticated. Other routes render an `AuthWall` around protected workflows and show the login/register panel when needed.

## Architecture

- `src/components/providers/app-providers.tsx` composes theme support, React Query, auth context, and toast notifications. Query defaults use a 60-second stale time, no refetch on window focus, one query retry, and no mutation retries.
- `src/lib/api-client.ts` is the API gateway. It uses `fetch`, sends JSON, attaches `Authorization: Bearer <token>` when available, unwraps successful `{ data }` responses, and throws an error with `code = 401` for unauthorized responses.
- `src/lib/auth-storage.ts` stores the JWT and cached user profile in `localStorage` under `experience:auth-token` and `experience:auth-user`. Auth helpers guard `typeof window`, so they are safe to import from client modules.
- `src/contexts/auth-context.tsx` owns login, registration, logout, and profile refresh. It can hydrate from a cached user before forcing `/auth/me`.
- `src/services/*.ts` group backend calls by domain (`auth`, `projects`, `resumes`, `retrieval`, `intelligence`, `settings`, `profile`, `llm`, `knowledge-graph`, `conversations`). Add new endpoints there before calling them from components.
- `src/types` mirrors API payloads and response shapes. Keep these types aligned with backend route contracts when adding fields.

## Key Workflows

- **Authentication**: `AuthPanel` posts to `/auth/login` or `/auth/register`, then `AuthProvider` stores the returned JWT and user profile. Protected UI uses `AuthWall`.
- **Project intelligence**: the dashboard can index GitHub or local sources, list projects, render the knowledge graph, and browse LLM model catalogs.
- **Resume studio**: `/resume` lists resumes and currently passes the first returned resume into `ResumeBuilder`. Resume services cover ingest, section generation, section improvement, and persisted section updates.
- **Cover-letter studio**: `/cover-letter` can analyze a job description, then seed cover-letter generation with the matched `resumeId` and `projectIds` from job intelligence.
- **Exports**: resume and cover-letter exports are client-only helpers in `src/lib/exporters.ts`; they no-op during server rendering and dynamically load PDF/DOCX libraries in the browser.
- **Settings**: `/settings` manages user defaults and provider keys through authenticated settings services. Backend storage encrypts provider keys.

## Developer Notes

- The API must return the shared envelope documented in `docs/frontend.md`: `{ "data": T }` on success or `{ "error": { "message": string, "details"?: unknown } }` on failure.
- Most forms validate with `zod` before calling services. Keep backend validation errors surfaced through toast or inline UI so users can correct inputs.
- Long-running LLM actions are modeled as React Query mutations. Disable submit buttons while pending and keep optimistic UI scoped to the component initiating the request.
- `axios` is listed as a dependency, but the current source uses the shared `fetch` client in `src/lib/api-client.ts`.
- `.env*` files are gitignored. Do not commit real API URLs, keys, or user data.

## Related Docs

- `docs/frontend.md` - API integration contract and route examples.
- `docs/frontendv2.md` - resume section editing and developer baseline report workflows.
- `../README.md` - monorepo setup.
- `../resume-tailor-api/README.md` - backend setup, routes, and environment variables.
