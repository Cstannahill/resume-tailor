# Resume Tailor Frontend

Next.js workspace for the Resume Tailor Experience API. The app lets developers sign in, index projects, ingest and edit resumes, run persona coaching, generate tailored collateral, inspect the knowledge graph, and manage LLM provider settings.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 with local UI primitives in `src/components/ui`
- TanStack Query for API data fetching and cache invalidation
- `jsPDF`, `docx`, and `file-saver` for PDF/DOCX exports

## Local Setup

```bash
npm install
touch .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` when the API is not running on `http://localhost:4000`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Open `http://localhost:3000`. Most workspace features require an API JWT from the sign-in/register panel and a running `resume-tailor-api` instance with PostgreSQL configured.

## Routes and Workflows

| Route | Purpose | Primary codepaths |
| --- | --- | --- |
| `/` | Auth panel plus the main workspace: project indexing/listing, resume insights, tailored assets, persona coaching, knowledge graph, LLM catalog, and developer report. | `src/app/page.tsx`, `components/modules/*` |
| `/resume` | Resume ingestion, section editing, AI generate/improve actions, and resume export. | `src/app/resume/page.tsx`, `components/modules/resume/*`, `services/resumes.ts` |
| `/cover-letter` | Tailored cover-letter workbench with job-intelligence prefill and PDF/DOCX export. | `src/app/cover-letter/page.tsx`, `components/modules/retrieval/*`, `components/modules/intelligence/*` |
| `/settings` | User defaults and encrypted provider-key management. Hidden from navigation until authenticated. | `src/app/settings/page.tsx`, `components/modules/settings/settings-panel.tsx` |

The app shell in `src/components/layout/app-shell.tsx` owns top-level navigation, theme controls, and account actions. `AuthWall` gates pages or modules that need a token.

## API Client Pattern

- `src/lib/api-client.ts` builds requests from `NEXT_PUBLIC_API_BASE_URL`, attaches `Authorization: Bearer <token>` when present, and unwraps successful `{ data: T }` responses.
- `src/contexts/auth-context.tsx` stores the logged-in user and token via `src/lib/auth-storage.ts`.
- Service modules in `src/services` map React components to API routes. Keep request bodies aligned with `resume-tailor-api/docs/frontend.md` and `resume-tailor-api/docs/frontendv2.md`.
- Do not send `userId` from the frontend for protected write routes such as resume ingest, retrieval tailoring, job intelligence, or developer reports; the API derives ownership from the JWT.

## Common Development Tasks

```bash
npm run dev      # Start the Next.js dev server
npm run build    # Create a production build
npm run start    # Serve the production build
npm run lint     # Run ESLint
```

## Troubleshooting

- **401 after sign-in**: clear local storage and sign in again. The API client treats 401 responses specially so `AuthWall` can recover.
- **Network/CORS failures**: verify `NEXT_PUBLIC_API_BASE_URL` points to the API and that `resume-tailor-api` includes the frontend origin in `CORS_ALLOWED_ORIGINS`.
- **Model/provider errors**: confirm provider keys in `/settings` or backend runtime env. The frontend model catalog reads public `/llm/*` routes, but generation endpoints still need provider credentials.
- **Resume ingest validation mismatch**: the API accepts `resumeText` of at least 50 characters; the current UI form requires a longer draft before submit for better LLM output quality.

## Related Docs

- Backend overview and route index: `../resume-tailor-api/README.md`
- Frontend/API contract: `../resume-tailor-api/docs/frontend.md`
- Resume section editing and developer report addendum: `../resume-tailor-api/docs/frontendv2.md`
- JSON collateral parsing notes: `../resume-tailor-api/docs/cover-letter.md`
