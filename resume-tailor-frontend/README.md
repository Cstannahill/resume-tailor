# Resume Tailor Frontend

Next.js workspace for the Resume Tailor platform. The app gives authenticated users a single UI for indexing projects, ingesting and editing resumes, running persona coaching, generating cover letters, reviewing job-description intelligence, browsing the knowledge graph, and managing encrypted LLM provider settings.

## Tech Stack

- Next.js 16 App Router with React 19 and TypeScript.
- Tailwind CSS 4 plus local `src/components/ui/*` primitives.
- TanStack Query for server state, mutations, retries, and cache lifetimes.
- Browser `fetch` through `src/lib/api-client.ts` for API calls.
- `sonner`, `lucide-react`, `docx`, `jspdf`, and `file-saver` for UX feedback and exports.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local env file:

```bash
printf 'NEXT_PUBLIC_API_BASE_URL=http://localhost:4000\n' > .env.local
```

`NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:4000` in code, but keeping it in `.env.local` makes non-default API ports and deployed API URLs explicit. This package ignores `.env*` files, so do not commit local secrets or deployment values.

3. Start the API from `../resume-tailor-api`, including PostgreSQL, Prisma migrations, `AUTH_JWT_SECRET`, `APP_ENCRYPTION_KEY`, and at least one LLM provider key.

4. Run the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the production app. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run the Next.js ESLint configuration. |

## App Structure

```text
src/
  app/                         # App Router pages and layout
  components/
    dashboard/                 # Workspace KPI cards
    layout/                    # App shell, nav, auth actions
    modules/                   # Feature panels for API modules
    providers/                 # Theme, TanStack Query, auth, toaster
    ui/                        # Shared UI primitives
  contexts/                    # Auth context and profile refresh
  hooks/                       # Local UI state hooks
  lib/                         # API client, exports, constants, utils
  services/                    # Typed API wrappers per backend module
  types/                       # API payload and UI data contracts
```

Key routes:

- `/` - authenticated workspace dashboard with project indexing, project list, resume insights, tailored assets, persona coaching, knowledge graph, LLM catalog, and developer report.
- `/resume` - resume ingest and section editing/export workflow.
- `/cover-letter` - cover-letter generation paired with job-intelligence analysis.
- `/settings` - authenticated profile defaults and encrypted provider-key management.

## API Integration

`src/lib/api-client.ts` centralizes requests:

- Resolves relative paths against `NEXT_PUBLIC_API_BASE_URL`.
- Sends `Content-Type: application/json`.
- Attaches `Authorization: Bearer <token>` from browser storage when present.
- Unwraps successful `{ data: T }` responses and raises API error messages for failed JSON responses.

Auth state lives in `src/contexts/auth-context.tsx`; login and registration persist the JWT and user profile through `src/lib/auth-storage.ts`. Most workspace panels are wrapped in `AuthWall` because backend write routes derive `userId` from the JWT rather than accepting client-supplied ownership.

The knowledge graph service currently calls `GET /knowledge-graph` without a `userId` query. The backend supports an explicit `userId` filter, but it does not infer one from the JWT for this public route.

See `docs/frontend.md` for route-level integration notes and `docs/frontendv2.md` for resume-section and developer-report workflows.

## Common Pitfalls

- **401 after login refresh**: the auth context clears invalid tokens when `GET /auth/me` fails. Sign in again and verify the API uses the same `AUTH_JWT_SECRET` that issued the token.
- **CORS errors**: add the frontend origin to API `CORS_ALLOWED_ORIGINS`; local API defaults allow `http://localhost:3000`.
- **Empty authenticated panels**: create data through the UI or API after signing in. Routes such as resumes, tailored assets, and settings are scoped to the current JWT user.
- **Project details return 403**: public projects can be read without auth, but owned projects require the owner JWT.
- **LLM actions fail**: configure provider keys in the API environment or through the Settings page. Frontend provider choices are limited to `ollama`, `bedrock`, `google`, and `openrouter`.
