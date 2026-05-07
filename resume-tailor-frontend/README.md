# Resume Tailor Frontend

Next.js app for the Resume Tailor experience workspace. It consumes the Express Experience API to index projects, ingest and refine resumes, run persona coaching, analyze job descriptions, generate tailored assets, and manage encrypted LLM provider settings.

## Prerequisites

- Node.js `>=20`
- The API package running locally, usually at `http://localhost:4000`
- A registered API user before using protected workspace screens

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file when the API is not on the default URL:

```bash
printf 'NEXT_PUBLIC_API_BASE_URL=http://localhost:4000\n' > .env.local
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Verify API connectivity if the UI cannot load data:

```bash
curl http://localhost:4000/health
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000` | Base URL used by `src/lib/api-client.ts` for all API requests |

The auth context stores the JWT and cached user snapshot in `localStorage` keys prefixed with `experience:auth-`. If local auth state gets stale during development, sign out or clear those keys in the browser.

## App Structure

```text
src/
  app/                     # Next.js route pages
    page.tsx               # Workspace dashboard
    resume/page.tsx        # Resume ingest, builder, section editing
    cover-letter/page.tsx  # Cover letter tailoring and job intelligence handoff
    settings/page.tsx      # Profile defaults and provider keys
  components/
    layout/                # App shell and navigation
    modules/               # Feature modules mapped to API domains
    providers/             # Theme, React Query, auth, toasts
    ui/                    # Shared UI primitives
  contexts/auth-context.tsx
  lib/api-client.ts        # Fetch wrapper, bearer token attachment, data unwrapping
  services/                # Typed API route wrappers
  types/                   # Shared payload and response types
```

React Query is configured in `src/components/providers/app-providers.tsx` with a 60-second stale time, no window-focus refetch, one query retry, and no mutation retries.

## API Workflows

- **Authentication**: `src/contexts/auth-context.tsx` calls `src/services/auth.ts`, persists the JWT, attaches it through `apiRequest`, and clears auth state when `/auth/me` cannot refresh.
- **Workspace dashboard**: `src/app/page.tsx` composes project indexing/listing, resume insights, coaching, tailored assets, knowledge graph, LLM model catalog, and developer report cards behind `AuthWall`.
- **Resume studio**: `src/app/resume/page.tsx` lists resumes and passes the first result to `ResumeBuilder`; multi-resume selection is not currently exposed in the UI.
- **Cover letter studio**: `src/app/cover-letter/page.tsx` lets `JobIntelWorkbench` feed matched resume and project IDs into `CoverLetterWorkbench` after analysis completes.
- **Settings**: `src/app/settings/page.tsx` manages the authenticated profile, default provider, notification preferences, and encrypted provider keys.

See `docs/frontend.md` for the API contract and `docs/frontendv2.md` for resume-section editing details.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Build the production app |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## Troubleshooting

- **Network or CORS errors**: confirm the API is running and that its `CORS_ALLOWED_ORIGINS` includes the frontend origin.
- **Unexpected 401s**: clear `experience:auth-token` and `experience:auth-user`, then sign in again.
- **Validation errors missing field details**: the shared API client currently throws `error.message`; extend `handleResponse` if a form needs backend `error.details`.
- **Empty graph or project data**: check whether the API route is public or scoped. `GET /projects?mine=true` needs a valid JWT to filter to the current user, while `GET /knowledge-graph` is not automatically scoped to the JWT.
