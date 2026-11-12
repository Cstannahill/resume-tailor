# Startup parsing and the health check

`src/config/env.ts` parses `process.env` at import time. A failed parse throws a Zod error and the process exits before `app.listen`. `GET /health` only reports that the process reached the handler.

Sources: `src/config/env.ts`, `src/utils/encryption.ts`, `src/config/logger.ts`, `src/db/client.ts`, `src/server.ts`, `src/app.ts`.

## Where `.env` is loaded

`env.ts` imports `dotenv/config`, which reads `.env` from `process.cwd()`. `npm run dev` inside `resume-tailor-api` uses that directory. Starting `tsx` from the monorepo root does not load `resume-tailor-api/.env`, so `DATABASE_URL` is missing and startup fails with a Zod "Required" issue.

An empty assignment such as `PORT=` is the string `""`. Zod `.default()` and `.optional()` apply only when the value is `undefined`.

## Empty values versus omitted values

Checked with Zod `3.23.8`, the version in `resume-tailor-api/package.json`.

| Variable | Omitted | Set to `""` |
| --- | --- | --- |
| `NODE_ENV` | `development` | Zod enum failure. Process exits during import. |
| `PORT` | `4000` | `0`. See listen behavior below. |
| `DEFAULT_LLM_PROVIDER` | `ollama` | Zod enum failure. |
| `OLLAMA_BASE_URL` | `https://ollama.com` | Zod URL failure. The default is not applied. |
| `OPENROUTER_BASE_URL` | unset, adapters use `https://openrouter.ai/api/v1` | Zod URL failure. `.optional()` does not accept `""`. |
| `DATABASE_URL` | Zod "Required" | Zod URL failure. |
| `AUTH_JWT_SECRET` | Zod "Required" | Zod minimum-length failure (32). |
| `APP_ENCRYPTION_KEY` | Zod "Required" | Zod accepts `""`. `encryption.ts` then throws `APP_ENCRYPTION_KEY must decode to 32 bytes for AES-256-GCM` because `Buffer.from("", "base64")` is empty. |
| `BEDROCK_REGION` | `buildBedrockConfig()` uses `us-east-1` | Stored as `""`. `??` does not replace it, so the Bedrock client is built with an empty region. |

`PORT` with surrounding spaces still coerces (`" 4000"` becomes `4000`). `PORT=0` is accepted and behaves like the empty string.

## What the listen log reports

`server.ts` calls `app.listen(env.PORT)` and logs `http://localhost:${port}` with that same number.

`PORT=0` or `PORT=` asks the OS for an ephemeral port. The callback still prints `http://localhost:0`. The code never reads `server.address()`.

There is no `error` listener on the HTTP server. `EADDRINUSE` is an unhandled `'error'` event and the process exits. There is no `SIGTERM` / `SIGINT` handler that closes the server or `prisma.$disconnect()`.

## Logger and Prisma, by `NODE_ENV`

| `NODE_ENV` | Pino | Prisma client |
| --- | --- | --- |
| `development` | level `debug`, `pino-pretty` transport | log levels `query`, `error`, `warn`; client stored on `globalThis.prisma` |
| `test` | level `debug`, `pino-pretty` transport | log level `error` only; client stored on `globalThis` |
| `production` | level `info`, no pretty transport | log level `error` only; not stored on `globalThis` |

`pino-pretty` is a devDependency. `npm start` with `NODE_ENV` unset, `development`, or `test` loads that transport. A production install that omitted devDependencies fails while constructing the logger, after env parsing and before listen.

Prisma's `query` lines are printed by Prisma, separate from the pino logger.

## `GET /health`

Registered in `app.ts` after CORS, the 2mb JSON parser, and `optionalAuth`, and before the feature routers.

```json
{ "data": { "status": "ok", "environment": "development" } }
```

`environment` is `env.NODE_ENV`. The handler does not query Postgres, so a database outage still returns 200.

`optionalAuth` still runs. A valid bearer attaches `req.user`; the handler ignores it. An invalid bearer is ignored, same as other public routes. The route does not call `authenticate`.

A browser `Origin` that is not in `ALLOWED_ORIGINS` fails in the CORS callback and never reaches this handler. A request with no `Origin` (typical `curl`) is allowed. Only `GET` is registered; other methods on `/health` hit the 404 handler (`Route /health not found`).
