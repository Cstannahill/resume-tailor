# Resume Tailor Frontend

Next.js app for the Resume Tailor experience workspace. It consumes the Express API in `../resume-tailor-api` to index projects, ingest resumes, run persona coaching, generate tailored collateral, and manage account settings.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Point the app at the API:

```bash
printf "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000\n" > .env.local
```

3. Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000`. The API should be running on `http://localhost:4000`, and its `CORS_ALLOWED_ORIGINS` must include the frontend origin.

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start Next.js in development mode |
| `npm run build` | Build the production app |
| `npm run start` | Serve the built app |
| `npm run lint` | Run ESLint |

## App Routes

| Route | Purpose |
| ----- | ------- |
| `/` | Workspace dashboard with auth, project indexing/listing, resume insights, persona coach, tailored assets, knowledge graph, LLM catalogs, and developer report |
| `/resume` | Resume ingest and section-editing workspace |
| `/cover-letter` | Job intelligence plus cover-letter tailoring/export workflow |
| `/settings` | Auth-gated settings and provider-key management |

## Architecture

- `src/app/*` defines route-level screens and composes feature modules.
- `src/components/modules/*` contains workflow UI for auth, projects, resumes, conversations, retrieval, intelligence, knowledge graph, LLM catalogs, profile reports, and settings.
- `src/services/*` wraps API endpoints through `src/lib/api-client.ts`, which unwraps `{ data }` responses and throws API error messages.
- `src/contexts/auth-context.tsx` owns login/register/logout state. Tokens and cached profiles are stored in browser `localStorage` through `src/lib/auth-storage.ts`.
- `src/components/providers/app-providers.tsx` wires React Query, theme support, auth context, and toasts. Queries default to a 60 second stale time and one retry.
- `src/lib/exporters.ts` handles client-side PDF/DOCX export for generated collateral.

## API Contract Notes

- Configure the API base URL with `NEXT_PUBLIC_API_BASE_URL`; it defaults to `http://localhost:4000`.
- Protected calls attach `Authorization: Bearer <token>` automatically when a token exists in `localStorage`.
- Most write workflows derive `userId` from the JWT. Do not send `userId` in resume, retrieval, or job-intelligence request bodies.
- LLM calls use request-level `llmProvider` when provided, otherwise the API falls back to server `DEFAULT_LLM_PROVIDER`.
- Settings API field names are `defaultLlmProvider` and `notificationPrefs`. Saved provider keys are encrypted by the API, but runtime LLM adapters currently read server environment variables rather than decrypting saved user keys.

See `../resume-tailor-api/docs/frontend.md` for full payload shapes and response examples. Resume section APIs and developer-report details are in `../resume-tailor-api/docs/frontendv2.md`.

## Troubleshooting

- **401 responses**: clear `experience:auth-token` and `experience:auth-user` from browser storage, then sign in again.
- **Browser CORS errors**: add the frontend origin to the API `CORS_ALLOWED_ORIGINS`.
- **Settings saved but LLM calls still fail**: verify API env vars such as `OLLAMA_API_KEY`, `GOOGLE_GENAI_API_KEY`, or AWS credentials. Saved provider keys are not used by adapters yet.
- **API URL changes not reflected**: restart `npm run dev` after editing `.env.local`; Next.js reads public env values at startup/build time.
