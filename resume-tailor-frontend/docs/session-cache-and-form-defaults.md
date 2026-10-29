# Session cache and form defaults

The studio keeps one React Query client for the whole tab and several forms submit a different value from the label on the control. Package `@tanstack/react-query` `^5.62.1`.

## The cache is not tied to the signed-in user

`AppProviders` creates the `QueryClient` once. `staleTime` is 60 seconds, `refetchOnWindowFocus` is false, queries retry once, and mutations do not retry. No query sets `enabled` from auth status. Login and logout update `localStorage` and React state only. Nothing calls `queryClient.clear()` or `invalidateQueries` on those transitions.

Query keys have no user id:

| Key | Who the API scopes it to | Where it is subscribed |
| --- | --- | --- |
| `["resumes"]` | The JWT user. Ordered by `createdAt` descending. | `/resume` (page component), dashboard, cover letter |
| `["tailored-assets"]` | The JWT user | Dashboard |
| `["settings"]`, `["provider-keys"]` | The JWT user | Settings |
| `["projects"]`, `["knowledge-graph"]` | Not limited to the JWT user | Dashboard, cover letter, graph |

A query that stays mounted does not refetch just because its data became stale. Refetch on mount runs only when the observer mounts and the cached data is already stale.

### `/resume` stays subscribed while signed out

`src/app/resume/page.tsx` calls `useQuery(["resumes"])` above `AuthWall`, so the request starts even when the wall is showing the sign-in form.

- With no token, the list returns 401, retries once, and settles in the error state. Signing in on that page does not remount the query. `isLoading` is then false and `data` is missing, so `ResumeBuilder` opens on the default template and AI actions stay disabled until a full remount or another invalidation.
- Switching accounts without leaving `/resume` keeps the previous success result. The builder uses `data?.[0]`, the newest resume for whoever fetched it. `AuthWall` unmounts the builder while signed out and remounts it on the next sign-in, still with that cached row.

### Other pages remount, and a fresh cache is reused

Dashboard, cover letter, and settings queries sit inside `AuthWall`, so they unmount on sign-out. The cache stays in the provider. Signing back in within 60 seconds mounts those queries while the data is still fresh, and they render the previous account:

- The cover-letter resume `<select>` lists those cached resume ids.
- Saved provider keys render `providerKeysQuery.data`. Remove sends `DELETE /settings/provider-keys/:provider` for the current token. A provider that exists only in the previous account's cache is not on the current user.
- Tailored-asset and resume cards render the cached lists.

`POST /resumes/ingest` invalidates `["resumes"]`. Applying a section suggestion, indexing a project, and generating a cover letter do not.

## "Auto-select latest" submits an empty resume id

The cover-letter resume `<select>` is registered with React Hook Form and has no `defaultValues`. The first option is `value=""` and the label is "Auto-select latest". Submit therefore sends `resumeId: ""`.

`tailorJobMaterials` uses the latest resume only when `resumeId` is `undefined`. An empty string is defined, so `getResumeById("")` runs, the resume context is empty, and the saved asset stores `resumeId: null`. Choosing a real option, or arriving with `intelContext.resumeId`, replaces that empty value.

## Experience generate follows the stored row, then Apply overwrites it

"Add role" updates the local draft only. Generate still posts `experienceIndex` for that local slot. The API copies `jobTitle`, `company`, and `achievements` from the stored experience at that index when the body omits them, and the form omits them. The suggestion is about the database row, which can be a different role or no row.

Apply then `PATCH`es the whole local experience array. The API keeps `company`, `role`, and `achievements` on each item and drops the other keys.

## Cover-letter text and export title

`parseCoverLetterContent` `JSON.parse`s `record.content` when it looks like JSON. If that parse succeeds and `content` is not a string, the textarea receives the raw JSON text. `projectHighlights` and `resumeBullets` use `??`, so a parsed empty array replaces the recommendation arrays from the API.

The PDF and DOCX buttons call `exportToPdf` / `exportToDocx` with no `catch`. The document title is `` `${jobTitle || "Cover Letter"} - ${llmProvider ?? "auto"}` ``. The download names stay `cover-letter.pdf` and `cover-letter.docx`.
