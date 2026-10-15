# Auth status mapping

`optionalAuth` runs on every request. `authenticate` is mounted only on the routers that import it (auth `/me`, resumes, conversations, retrieval, intelligence, profile, settings, and `POST /projects/index`). Project reads, `GET /llm/*`, `GET /knowledge-graph`, and `GET /health` stay on optional auth.

## Optional auth versus required auth

| Check | Invalid or expired bearer | User row deleted | `req.user` shape |
| --- | --- | --- | --- |
| `optionalAuth` | Token is ignored. No log. Request continues with no user. | Still attaches `{ id: payload.sub, email }` from the JWT. No database read. | `id`, `email` only |
| `authenticate` | `401` `{ "error": { "message": "Unauthorized" } }` written in the middleware. The JWT error is not logged. | Same 401 after `getUserById` misses. | `id`, `email`, `displayName` from the row |

`GET /projects?mine=true` adds an owner filter only when the query value is the exact string `true` **and** optional auth set `req.user`. An expired token drops that owner filter. `search` and `technology` still apply. With no other filters the handler returns every project, ordered by `updatedAt` descending, with no `take`. `mine=TRUE` or `mine=1` does not filter.

`GET /projects/:projectId` for a row with `ownerId` set returns **403** `Forbidden` when the caller is missing or is a different user. It does not return 401. A row with `ownerId` null is readable without a token.

Passwords are hashed with bcrypt, **12** salt rounds.

## Login and register collapse errors

`handleLogin` catches every exception from `authenticateUser`, including database failures, and throws `HttpError(401, 'Invalid credentials')`. The original error is discarded, so a Postgres outage during login is logged as a handled 401 and is indistinguishable from a bad password.

`handleRegister` catches every exception and throws `HttpError(400, error.message)`. A duplicate email is `400` with message `Email already registered` (not 409). A Prisma failure is also **400**, and the client receives that error's message. Zod failures never reach this catch; they are `400` `Validation failed` with `details` set to the issue list. Register password minimum is 8. Login password minimum is 1, so a one-character password is checked against the hash rather than rejected as validation.

The studio client replaces **any** HTTP 401 with the message `Unauthorized` before it reads the JSON body. `Invalid credentials` is what curl sees. The sign-in form shows `Unauthorized` on the email field. Register stays on 400, so `Email already registered` and `Validation failed` do reach the form. `error.details` is still dropped by `apiRequest`.

## Profile update clears omitted names

`PUT /auth/me` accepts `{ "displayName": string }` and the field is optional. `updateUserDisplayName` writes `displayName ?? null`, so `{}` or a JSON body that omits the field **clears** the stored name. `""` is stored as an empty string. The studio defines `updateProfile` and never calls it.

## Provider-key delete

`DELETE /settings/provider-keys/:provider` returns **204** with an empty body when the `(userId, provider)` row exists. A second delete calls `prisma.userProviderKey.delete` for a missing row, which throws. That is a generic `Error`, so the handler responds **500** `Internal Server Error`, not 404.

`listProviderKeys` never selects `encryptedKey`. `getProviderKey` and `decryptSecret` have no callers. Saved keys are not decrypted when a model request runs; adapters read process env vars. `PUT /settings/provider-keys` requires `apiKey` length ≥ 8.
