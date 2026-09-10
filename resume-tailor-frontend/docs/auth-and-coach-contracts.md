# Auth and coach contracts (studio)

UI pitfalls that are not the settings-field rename, catalog shape, or resume `insight` GET mismatch. Pair with `resume-tailor-api/docs/auth-identity-and-sessions.md` and `conversation-client-contract.md`.

Sources: `src/types/auth.ts`, `src/contexts/auth-context.tsx`, `src/lib/api-client.ts`, `src/components/modules/auth/auth-panel.tsx`, `src/components/layout/app-shell.tsx`, `src/app/resume/page.tsx`, `src/components/modules/conversations/conversation-coach.tsx`.

## Register / header identity

The Name field on create-account is `name`. The API only persists `displayName` and strips unknown keys, so the value never lands in Postgres.

The header shows `user?.name ?? user?.email`. Login/`/auth/me` return `displayName`, so the menu label is the email.

Client Zod allows passwords of length **6**; register on the API requires **8**. Use 8+ characters or the form succeeds locally and the request 400s.

## 401 does not log you out

`apiRequest` throws `Unauthorized` on 401 without clearing `experience:auth-token` / `experience:auth-user`. `AuthProvider` only clears those keys when `loadProfile()` fails (no cached user, or `refreshProfile()`).

With a cached user JSON, boot skips `/auth/me`. An expired JWT still paints the workspace until something else fails. There is no global React Query 401 handler. `refreshProfile()` (`GET /auth/me` + cache replace) is exported from `useAuth` and is not called by any page.

## `/resume` fetches while logged out

`src/app/resume/page.tsx` calls `listResumes()` in `useQuery` **above** `AuthWall`. An anonymous visit fires `GET /resumes` (401), React Query retries once, then the wall renders `AuthPanel`. Cover-letter and settings keep their queries inside the wall.

After sign-in, `/resume` still binds the builder to `listResumes()[0]` (newest `createdAt`). That list row has Prisma columns, not `insight` — see `studio-data-shapes.md` on the retrieval PR if that file is present.

## Persona coach history

`ConversationCoach` never calls `getConversation`. Refresh starts over.

Session history renders `response.question.text`, but the API row's `question` is a **string**, so headings are blank. Answers and evaluation text still show.

Focus areas are split on commas without trimming (`" scaling"` is kept).

## Related codepaths

- `src/app/resume/page.tsx`
- `src/components/modules/auth/auth-panel.tsx`
- `src/components/modules/conversations/conversation-coach.tsx`
- `src/contexts/auth-context.tsx` / `src/lib/api-client.ts`
- `src/components/layout/app-shell.tsx`
