# Project read authorization

`POST /projects/index` is authenticated. **Reads are not.** The list and detail endpoints do not use `authenticate`; they only see `req.user` when `optionalAuth` successfully verified a JWT.

Sources: `src/routes/project.routes.ts`, `src/modules/projects/projectIndexing.controller.ts`, `src/repositories/projects/project.repository.ts`.

## Endpoint behavior

| Route | Middleware | Who can read |
| --- | --- | --- |
| `GET /projects` | none (`optionalAuth` only) | Anyone. Returns **full Prisma `Project` rows** (summary, technologies, highlights, `insights`, `localPath`, `repoUrl`, `ownerId`). |
| `GET /projects?mine=true` | same | Filters to `ownerId = req.user.id` **only if** a valid JWT populated `req.user`. Invalid tokens are ignored, so this filter is skipped. |
| `GET /projects/:projectId` | same | `404` if missing. If `ownerId` is set and does not match `req.user.id` (or there is no user) → **403**. If `ownerId` is `null` → world-readable. |

The studio never calls `GET /projects/:projectId`. `ProjectList`, KPIs, cover-letter project chips, and job-intel matching all use `GET /projects` with no `mine` flag.

## List vs detail mismatch

`listProjects()` and `getProjectById()` return the same `Project` record shape. The 403 on `GET /:id` does not hide anything the list already returned.

Stored on every indexed row (and therefore on the public list):

- `insights.files`: relative paths, language, line counts, detected `export` names (up to 250 files).
- `localPath` for `kind: "local"` indexes (host filesystem path on the **API** machine).
- `repoUrl` for GitHub indexes.
- LLM `summary` and heuristic `highlights` / `keyFunctionality`.

`optionalAuth` does **not** look up the user in the database. A JWT for a deleted user still sets `req.user`, while a malformed token is treated as anonymous.

## Constraints

- `mine=true` without a valid JWT is equivalent to an unscoped list.
- `ownerId` query param is accepted as a raw string (no check that it matches the caller).
- Indexing upserts globally by `repoUrl` / `localPath`, then sets `ownerId` to the indexing user. A later indexer of the same URL overwrites the row, including owner.

## Related codepaths

- `src/middleware/authenticate.ts` — `optionalAuth` vs `authenticate`
- `src/app.ts` — `optionalAuth` mounted globally
- `resume-tailor-frontend/src/services/projects.ts` — `listProjects()` with optional `mine`
- `resume-tailor-frontend/src/components/modules/projects/project-list.tsx`
