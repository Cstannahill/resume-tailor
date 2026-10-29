# Partial writes, file selection, and secret handling

Verified against the services and the init migration. These are the failure and storage behaviors around indexing, coaching, resume section saves, and provider credentials.

## Which files an index reads

`analyzeSourceFiles` calls `fast-glob` with `codeGlob`, `ignoredGlobs`, and `onlyFiles: true`. It does not set `dot` or `followSymbolicLinks`.

| Option | Effective value | Result |
| --- | --- | --- |
| `dot` | `false` (library default) | A path segment that starts with `.` is skipped. `.next/**` and `.github/**` are not in the 250-file window. |
| `followSymbolicLinks` | `true` (library default) | A symlink directory inside the tree is walked. `fs.readFile` reads the target. The stored path is `path.relative` through the symlink, so the artifact path looks in-tree. |
| `ignoredGlobs` | `node_modules`, `dist`, `build`, `.git`, `*.lock`, `*.min.*` | `venv` and `target` are not in this list and still consume file slots. |

The 250-file slice is whatever order `fast-glob` returns. There is no sort and no per-file size cap.

Local `source.path` is passed to `fs.stat` unchanged. A relative path is resolved from `process.cwd()` of the API process (the directory `npm run dev` was started in). A path that exists and is not a directory is HTTP 400. A missing path throws from `fs.stat` and becomes HTTP 500.

## Clone errors include the URL

`buildGitCloneError` sets the message to `Failed to clone repository ${repoUrl}` and puts the same string on `details.repoUrl`. `errorHandler` returns `details` for every `HttpError`. An `https://user:token@host/...` URL passes `z.string().url()` and is copied into the JSON error body. Strip userinfo before sending a repo URL to `POST /projects/index`.

## Technology inserts can fail after the project is saved

`indexProject` commits in this order:

1. `upsertProject`
2. `replaceProjectArtifacts` (`deleteMany`, then `createMany`)
3. `syncProjectTechnologies` (`deleteMany`, then `ensureTechnologies`, then `createMany`)
4. two `createInsight` rows (`project-index`, then `project-summary`)

`ensureTechnologies` inserts missing names in one Prisma `$transaction` of individual `technology.create` calls. `Technology.name` is unique and case-sensitive. Two indexes that both see a new name such as `TypeScript` can fail that transaction with a unique violation. By then the project row exists, artifacts have been replaced, and project-technology links have been deleted. The handler returns 500. A later index of the same repo URL or local path updates that project row.

Nothing deletes `Technology` rows. Names accumulate for the life of the database.

`POST /projects/index` always sets `userId` from the authenticated user. The `'system'` fallback inside `indexProject` is only reached by an in-process call that omits `userId`. `createInsight` connects `Insight.user`, so that fallback fails the user foreign key after the project row is already written.

## Coaching saves the answer before it advances the question

`submitConversationAnswer` does three writes that are not one transaction:

1. `appendConversationResponse` inserts the answer. `currentQuestion` is unchanged.
2. Two `createInsight` calls (`conversation-response`, then `conversation-evaluator`). Technology names come from the session `focusAreas`, or from `evaluation.insights` when `focusAreas` is empty.
3. `updateConversationSession` sets `currentQuestion` to `evaluation.nextQuestion.text` or `null`, and replaces `insights` with `{ lastEvaluation }`.

A throw in step 2 (database error, or a technology-name unique violation) leaves the answered question in place. The client receives 500. Submitting again inserts another `ConversationResponse` for the same question. `GET /conversations/session/:id` shows the stored rows; the respond handler does not roll them back.

## Section PATCH keeps a narrow shape

`normalizeSectionContent` is what `PATCH /resumes/:id/sections/:section` persists:

| Section | Stored value |
| --- | --- |
| `summary` | The string as `extractedSummary`. Any other JSON value is `JSON.stringify`'d into that column. |
| `skills` | Array items are `String(item)`. A string is split on newlines and commas. Any other value becomes `[]`. |
| `experiences` | A non-array becomes `[]`. Each object keeps `company`, `role`, and `achievements` only. A string `achievements` becomes a one-element array. `startDate`, `technologies`, and `notes` are dropped. |
| `education` | An array is stored as given. A string becomes `[{ summary }]`. Anything else becomes `[]`. |
| `contact` | An object is stored as given. Anything else becomes `{ raw: "<string>" }`. |

Generate and improve for `experiences` fill `jobTitle`, `company`, and `achievements` from the stored row at `experienceIndex` when the client omits them (`mergeResumeContext`). The studio sends the index and a notes sentence, and does not send the role currently typed in the form. The prompt therefore describes the database row at that index. "Add role" only changes local draft state until Apply, so a new local row can point the prompt at a different stored role, or at no row.

## Section prompts repeat the user snapshot in `notes`

`buildSectionContext` loads `collectUserContext` and, when that snapshot has any text, appends `composeUserContextNotes` to `context.notes`. The studio always sends a notes sentence, so the prompt's Notes block is that sentence plus:

- resume summary
- up to 20 skills
- up to 3 experience lines
- up to 3 owned projects (newest `updatedAt`), each including the full stored `summary`
- up to 4 conversation insights and 4 other insights

The same snapshot is also copied into `resumeHighlights`, `projectHighlights`, `personaInsights`, and `additionalInsights`. Generate and improve both run with `maxOutputTokens: 500`, while this input can include three full project summaries.

## Provider secrets

`src/utils/encryption.ts` runs when the settings router is imported, which is during process startup. `APP_ENCRYPTION_KEY` only has to be a string to pass env parsing. A value that does not base64-decode to 32 bytes throws `APP_ENCRYPTION_KEY must decode to 32 bytes for AES-256-GCM` before `listen`.

Stored blobs are base64 of `12-byte IV || 16-byte auth tag || ciphertext`. The blob has no key id. Replacing `APP_ENCRYPTION_KEY` does not rewrite existing rows.

`PUT /settings/provider-keys` with `metadata` omitted stores `Prisma.JsonNull` and replaces any previous metadata. The studio sends `{ provider, apiKey }` only.

Google model listing requests `https://generativelanguage.googleapis.com/v1beta/models?key=<GOOGLE_GENAI_API_KEY>`. The key is on the URL.

Bedrock client config sets `credentials` only when both `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are non-empty. A single one of those variables is ignored and the AWS SDK default chain is used. When `BEDROCK_REGION` is unset, the region is `us-east-1`.

Passwords are hashed with bcrypt cost 12 (`SALT_ROUNDS` in `src/utils/password.ts`). Register checks a minimum length of 8 and no maximum.

Generate and model listing read process env. They do not call `getProviderKey`.

## What is not written down

`POST /intelligence/job` and `POST /profiles/developer-report` return the model result and do not insert a row. Refreshing the studio drops that result; it lives in component state.

From `prisma/migrations/20251117060259_init_db/migration.sql`:

- `Project.ownerId` is `ON DELETE SET NULL`. Deleting a user leaves their projects. `GET /projects/:id` returns 403 only when `ownerId` is set, so those rows are readable by id.
- `TailoredAsset.resumeId` is `ON DELETE SET NULL`. Deleting a resume keeps the asset with a null `resumeId`.
- Secondary indexes are the unique keys only: `User.email`, `UserProviderKey (userId, provider)`, and `Technology.name`.
