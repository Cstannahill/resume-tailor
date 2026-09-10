# Auth identity and browser sessions

The studio and API use different profile field names, different password floors, and different ideas of when a session is valid. This is distinct from JWT length/expiry and from the `/settings` `defaultProvider` mismatch.

Sources: `src/routes/auth.routes.ts`, `src/modules/auth/auth.{controller,service,types}.ts`, `src/middleware/{authenticate,errorHandler}.ts`, `src/app.ts`, `resume-tailor-frontend/src/{types/auth.ts,contexts/auth-context.tsx,lib/api-client.ts,components/modules/auth/auth-panel.tsx,components/layout/app-shell.tsx}`.

## Identity fields

| Surface | Display name field | Extra profile fields |
| --- | --- | --- |
| API register/login/`GET /auth/me` | `displayName` | `{ id, email, displayName }` only |
| API `PUT /auth/me` | `{ displayName? }` | `avatarUrl` is not a column |
| Studio types (`UserProfile`) | `name?` | `avatarUrl?`, `createdAt`, `updatedAt` |
| Studio register form | `name` (optional) | — |
| App chrome | `user?.name ?? user?.email` | — |

`POST /auth/register` Zod allows `{ email, password, displayName? }`. Unknown keys are **stripped**. The register form therefore POSTs `{ email, password, name }`, `name` is dropped, and the user is stored with `displayName: null`.

`GET /auth/me` returns `displayName`. The header never reads that key, so the account menu falls back to **email** even after a correct `PUT /auth/me`. `updateProfile()` in `src/services/auth.ts` sends `{ name?, avatarUrl? }` and is not wired into any page.

## Password floors

| Surface | Minimum |
| --- | --- |
| Studio login + register Zod | **6** (`auth-panel.tsx`) |
| `POST /auth/register` | **8** |
| `POST /auth/login` | **1** (non-empty) |

A 6–7 character password passes the create-account form and then 400s from the API (`Validation failed` with Zod issues). Duplicate email is also **400** (`Email already registered`), not 409. Login maps every service error to **401** `Invalid credentials`.

## When the UI thinks you are signed in

`AuthProvider.loadProfile()`:

1. No token → unauthenticated (and clears cached user).
2. Token **and** cached `experience:auth-user` → **authenticated immediately**. It does **not** call `GET /auth/me` unless `refreshProfile()` runs (`force = true`).
3. Token without a cached user → `GET /auth/me`; any failure clears token + user.

An expired JWT plus leftover localStorage therefore still renders the workspace. Tokens default to **1 day** (`src/utils/jwt.ts`).

`apiRequest` maps HTTP 401 to `Error("Unauthorized")` with `code = 401` **before** reading `{ error }`. That throw does **not** clear storage. Only `loadProfile()`'s catch path logs the user out. Other 401s (expired token on `/resumes`, `/projects/index`, …) toast and leave `status === "authenticated"`.

`optionalAuth` (every request) ignores invalid tokens. `authenticate` also requires a live `User` row.

## CORS rejections are 500s

`app.ts` CORS `origin` callback throws `new Error('Not allowed by CORS')` for unknown `Origin` values. That is not an `HttpError`, so `errorHandler` returns **500** `{ error: { message: "Internal Server Error" } }`. Missing `Origin` (curl) is allowed. Default allow-list is `http://localhost:3000` (`CORS_ALLOWED_ORIGINS`).

## Related codepaths

- `src/routes/auth.routes.ts` / `src/modules/auth/*`
- `src/middleware/authenticate.ts` / `src/app.ts`
- `resume-tailor-frontend/src/contexts/auth-context.tsx`
- `resume-tailor-frontend/src/lib/api-client.ts`
- `resume-tailor-frontend/src/components/modules/auth/auth-panel.tsx`
- `resume-tailor-frontend/src/components/layout/app-shell.tsx`
