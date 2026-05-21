# Experience Studio Frontend

Next.js client for Resume Tailor. The app lets authenticated users index projects, ingest and edit resumes, run persona coaching, analyze job descriptions, generate tailored assets, inspect a knowledge graph, and manage LLM settings.

## Tech Stack

- Next.js `16` App Router with React `19` and TypeScript.
- TanStack Query for API state, mutations, retries, and caching.
- Tailwind CSS `4`, Radix primitives, and local `src/components/ui/*` building blocks.
- `docx`, `jspdf`, and `file-saver` for resume and cover-letter exports.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure the API base URL:

```bash
cp .env.example .env.local
```

`NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:4000` in `src/lib/constants.ts`, so the env file is optional for default local development.

3. Start the backend API from `../resume-tailor-api`, then run:

```bash
npm run dev
```

Open `http://localhost:3000`.

## App Structure

```text
src/
  app/                         # App Router pages for workspace, resume, cover-letter, settings
  components/layout/           # Shell, navigation, auth actions
  components/modules/          # Feature workbenches and cards
  components/providers/        # Theme, QueryClient, auth, toaster providers
  contexts/auth-context.tsx    # Login/register/logout and cached profile state
  hooks/useResumeDraft.ts      # Local resume-builder draft state
  lib/api-client.ts            # Fetch wrapper, bearer token attachment, { data } unwrap
  lib/auth-storage.ts          # localStorage token/user persistence
  services/                    # Typed API route clients
  types/                       # API and UI contracts
```

## Core Workflows

- `/` renders the authenticated workspace: project indexing/listing, resume insights, tailored assets, persona coach, knowledge graph, model catalog, and developer report.
- `/resume` ingests resume text, builds an editable draft from extracted insights, and persists section updates through `/resumes/:id/sections/:section`.
- `/cover-letter` runs job intelligence first, then seeds the cover-letter workbench with matched `resumeId` and `projectIds` for tailored asset generation.
- `/settings` manages account profile, default LLM provider, notification preferences, and encrypted provider keys.

## API Integration

- `src/lib/api-client.ts` prefixes relative paths with `NEXT_PUBLIC_API_BASE_URL`, attaches `Authorization: Bearer <token>` when a token exists, unwraps successful `{ data }` responses, and throws the backend error message for failures.
- Auth state is initialized by `AuthProvider`, which reads `experience:auth-token` and `experience:auth-user` from `localStorage`; stale tokens are cleared when `/auth/me` fails.
- Query defaults live in `AppProviders`: one-minute stale time, no refetch on window focus, one query retry, and no mutation retries.
- Route payload details are documented in `../resume-tailor-api/docs/frontend.md`; newer resume-section and developer-report flows are in `../resume-tailor-api/docs/frontendv2.md`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the production app. |
| `npm run start` | Serve a production build. |
| `npm run lint` | Run ESLint. |

## Troubleshooting

- `Unauthorized` after sign-in usually means the token in `localStorage` is stale. Sign out or clear `experience:auth-token` and sign in again.
- Browser CORS failures must be fixed in the API `CORS_ALLOWED_ORIGINS`; include the exact frontend origin, such as `http://localhost:3000`.
- Empty project, resume, or tailored-asset lists are user-scoped for authenticated routes. Index a project or ingest a resume while signed in before testing downstream workflows.
- LLM-powered actions can take several seconds. The UI should leave mutation buttons disabled while requests are pending and show validation errors returned in `error.details`.
