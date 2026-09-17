# Resume Tailor Frontend

Next.js 16 (App Router) + React 19 studio for the Experience API: index projects, ingest resumes, coach against personas, analyze JDs, and export tailored cover letters.

Default local URL: `http://localhost:3000` (API default `http://localhost:4000`).

## Setup

There is **no** `.env.example` in this package. Next.js reads:

| Variable | Default |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000` (`src/lib/constants.ts`) |

Override in `.env.local`. The API must allow this origin via `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000`).

```bash
npm install
npm run dev
```

`npm run build` / `npm run start` for production. `npm run lint` runs ESLint.

## Routes

| Path | Surface |
| --- | --- |
| `/` | Workspace (indexer, graph, coach, developer report, KPIs) |
| `/resume` | Ingest + builder + PDF/DOCX export |
| `/cover-letter` | Tailor form + job intelligence + export |
| `/settings` | Defaults and provider keys (nav link hidden until signed in) |

`AppShell` “Sign in” jumps to `#auth-panel`. That id exists on every page’s `AuthWall` fallback.

## Docs

- `docs/frontend.md` — API integration notes (keep in sync with `../resume-tailor-api/docs/frontend.md`)
- `docs/frontendv2.md` — resume section generate / improve / PATCH
- `docs/export-and-deliverables.md` — client-side PDF/DOCX, draft hydration
- `docs/cover-letter-studio-handoff.md` — job-intel → tailor prefill

Monorepo setup: `../README.md`.
