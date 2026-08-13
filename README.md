# Resume Tailor Monorepo

Monorepo for the Resume Tailor platform:

- `resume-tailor-api`: Express + TypeScript backend for auth, project intelligence, resume ingestion, conversations, retrieval, and LLM integrations.
- `resume-tailor-frontend`: Next.js frontend for the user experience and API consumption.

## Repository Layout

```text
resume-tailor/
  resume-tailor-api/       # Backend API (Express + TypeScript + Prisma)
  resume-tailor-frontend/  # Frontend app (Next.js + React)
```

## Prerequisites

- Node.js `>=20`
- npm (bundled with Node)
- PostgreSQL (for `resume-tailor-api`)

## Quick Start (Local Development)

1. Install dependencies for each package:

```bash
cd resume-tailor-api
npm install

cd ../resume-tailor-frontend
npm install
```

2. Configure environment files:

```bash
cd ../resume-tailor-api
cp .env.example .env

cd ../resume-tailor-frontend
printf "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000\n" > .env.local
```

The frontend package has no `.env.example`. Next.js only loads `NEXT_PUBLIC_*` values from `.env.local` (or other Next env files), not from a root `.env`.

3. Update env values:

- API (`resume-tailor-api/.env`)
  - Set `DATABASE_URL`
  - Set `AUTH_JWT_SECRET` (at least 32 characters; the API refuses to start otherwise)
  - Set `APP_ENCRYPTION_KEY` (base64 that decodes to exactly 32 bytes)
  - Set `CORS_ALLOWED_ORIGINS` to include the frontend origin (`http://localhost:3000` by default)
  - Configure one or more LLM providers (`OLLAMA_*`, `BEDROCK_*`, `GOOGLE_GENAI_API_KEY`, `OPENROUTER_*`)
- Frontend (`resume-tailor-frontend/.env.local`)
  - Set `NEXT_PUBLIC_API_BASE_URL` (default in code: `http://localhost:4000`)

4. Initialize database (API package):

```bash
cd ../resume-tailor-api
npx prisma generate
npx prisma migrate dev
```

5. Run both apps in separate terminals:

```bash
# Terminal 1
cd resume-tailor-api
npm run dev
```

```bash
# Terminal 2
cd resume-tailor-frontend
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`

## Package Scripts

### `resume-tailor-api`

- `npm run dev` - Start API with `tsx watch`
- `npm run build` - Compile TypeScript to `dist/`
- `npm run start` - Run compiled API from `dist`
- `npm run lint` - Lint backend source
- `npm run prisma:migrate` - Run Prisma migrations in dev
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:deploy` - Apply migrations (deploy flow)

### `resume-tailor-frontend`

- `npm run dev` - Start Next.js in dev mode
- `npm run build` - Build frontend for production
- `npm run start` - Run production build
- `npm run lint` - Lint frontend source

## Notes

- This repository is structured as a monorepo but does not currently use npm/pnpm/yarn workspaces at the root.
- Each package manages its own dependencies and lockfile.
- For backend routes, env constraints, and operational caveats, see `resume-tailor-api/README.md`.
- For frontend architecture, auth storage, and troubleshooting, see `resume-tailor-frontend/README.md`.
