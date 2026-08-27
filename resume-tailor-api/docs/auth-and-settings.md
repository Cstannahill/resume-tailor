# Auth, CORS, and settings

How credentials, CORS, and `/settings` actually behave. Several UI labels imply runtime wiring that the API does not do.

Sources: `src/modules/auth/*`, `src/modules/settings/*`, `src/utils/{jwt,password,encryption}.ts`, `src/config/env.ts`, `src/app.ts`.

## Auth

| Route | Notes |
| --- | --- |
| `POST /auth/register` | `{ email, password, displayName? }`. Password min **8**. Duplicate email → **400** `Email already registered`. |
| `POST /auth/login` | Failed verify → **401** `Invalid credentials` (generic; no user enumeration in the message). |
| `GET /auth/me` | JWT user must still exist. |
| `PUT /auth/me` | `{ displayName? }` only. |

JWT payload is `{ sub: user.id, email }` signed with `AUTH_JWT_SECRET` (startup requires **≥ 32 characters**). Default expiry is **1 day** (`src/utils/jwt.ts`). Passwords use bcryptjs at **12** salt rounds.

`optionalAuth` runs on every request: missing/invalid tokens are ignored. `authenticate` requires a bearer token **and** a live user row; otherwise `{ error: { message: "Unauthorized" } }` with **401**.

## CORS

`CORS_ALLOWED_ORIGINS` is a comma-separated list (default `http://localhost:3000`). Requests with a disallowed `Origin` fail in the cors callback (`Not allowed by CORS`). Same-origin or no `Origin` (curl) is allowed.

The frontend default API base is `http://localhost:4000` (`NEXT_PUBLIC_API_BASE_URL`). There is no frontend `.env.example`; copy the API origin into `.env.local` if you change ports.

## Settings field mismatch

API (`UserSetting` / Zod):

- `defaultLlmProvider`: `ollama \| bedrock \| google \| openrouter`
- `notificationPrefs`: JSON object

Studio UI (`src/types/settings.ts` + `settings-panel.tsx`):

- PUT `{ defaultProvider }` and `{ notifications: { jobMatches, productUpdates } }`
- GET reads `defaultProvider` and `notifications`

`validateBody` replaces `req.body` with Zod's parsed object. Unknown keys are **stripped**. A UI PUT therefore arrives as `{}`. `updateUserSettings` then writes:

```text
defaultLlmProvider: input.defaultLlmProvider ?? null
notificationPrefs: input.notificationPrefs ?? null
```

So saving defaults or toggling notification checkboxes **clears** stored settings. GET still returns `defaultLlmProvider`, which the UI never reads, so the select falls back to `"ollama"`.

`defaultLlmProvider` is unused by `getLLMAdapter()` even when stored correctly. Per-request `llmProvider` or `DEFAULT_LLM_PROVIDER` wins.

## Provider keys

| Route | Behavior |
| --- | --- |
| `PUT /settings/provider-keys` | `{ provider, apiKey (≥8), metadata? }`. Encrypts with AES-256-GCM (`iv \|\| authTag \|\| ciphertext`, base64). Unique on `(userId, provider)`. |
| `GET /settings/provider-keys` | `{ id, provider, metadata, createdAt, updatedAt, configured: true }`. **No** ciphertext, **no** `lastFour`. |
| `DELETE /settings/provider-keys/:provider` | **204** empty body. |

`decryptSecret` is exported from `src/utils/encryption.ts` and is **not called** anywhere else. Adapters read process env (`OLLAMA_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_GENAI_API_KEY`, AWS keys). Stored keys never reach `generate()`.

The settings panel copies last-four digits into React state after a successful PUT and shows `"????"` after reload. Copy claiming keys are "decrypted at request time" is incorrect.

`APP_ENCRYPTION_KEY` must be base64 that decodes to **exactly 32 bytes** or the process throws at import time. Generate with `openssl rand -base64 32`.

## Related codepaths

- `src/modules/auth/auth.{controller,service}.ts`
- `src/modules/settings/settings.{controller,service}.ts`
- `src/middleware/authenticate.ts`
- `src/utils/encryption.ts`
- `resume-tailor-frontend/src/components/modules/settings/settings-panel.tsx`
- `resume-tailor-frontend/src/contexts/auth-context.tsx`
