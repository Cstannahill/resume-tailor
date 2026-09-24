# Indexing sample limits and HTTP error collapse

Behaviors that are easy to miss when reading the route list: what text the summary model sees, which files consume the analysis cap, how graph ids are minted, and which failures the client observes as a generic 500.

Sources: `src/modules/projects/projectIndexing.service.ts`, `src/prompts/basePrompts.ts`, `src/modules/knowledgeGraph/knowledgeGraph.service.ts`, `src/middleware/errorHandler.ts`, `src/repositories/users/user.repository.ts`, `src/config/logger.ts`, `src/db/client.ts`.

## What the summary model sees

`analyzeSourceFiles` keeps at most **250** matching files. `createProjectSummaryPrompt` then sends only the **first 15** of that list (`fileInsights.slice(0, 15)`), plus:

- the full language list
- up to 20 `keyFunctionality` lines (path + export names)
- the three heuristic highlight strings and `keyMetrics`

Files 16–250 are stored on the project (`insights.files` and `source_file` artifacts) and never enter the prompt. Glob order is whatever `fast-glob` returns; there is no sort by size, language, or export count. `keyFunctionality` can name files that were not in the 15-file sample.

The prompt asks for a JSON object with `executiveSummary`, `architecture`, `metrics`, `risks`, and `nextSteps`. `summarizeProject` stores `response.content` as the project `summary` with no `parseJsonResponse` call. The index handler returns that same string as `data.summary`.

## Language detection and the 250-file budget

| Extension | Technology label |
| --- | --- |
| `.ts`, `.tsx` | `TypeScript` |
| `.js`, `.jsx` | `JavaScript` |
| `.py` | `Python` |
| `.go` | `Go` |
| `.java` | `Java` |
| `.c` | `C` |
| `.cpp` | `C++` |
| `.h` | `C/C++` (separate from `C` and `C++`) |
| anything else | `Unknown` |

`Unknown` is removed from `technologies` but the file still counts toward the 250 cap and `totalLinesOfCode`. That includes every `package.json`, `requirements.txt`, and `pyproject.toml` hit by the manifest globs.

Ignored directories and names: `node_modules`, `dist`, `build`, `.git`, `*.lock`, `*.min.*`. These are **not** ignored, so they compete for the same 250 slots:

- `.next` (compiled JS)
- `coverage`, `out`, `vendor`, `target`
- Python virtualenvs (`venv`, `.venv`) when they contain `.py` files

Export detection is the regex `export (const|class|function|interface|type) Name`. Default exports, `export { ... }`, and non-JS/TS files produce no export names, so `keyFunctionality` stays empty for those trees even when the language list is populated.

There is no per-file byte cap. Each selected path is `readFile`d as UTF-8 in full before the line count and export scan. Index, tailor, and job-intel handlers do not set an HTTP timeout; the request stays open through clone, disk reads, and the provider call.

`ProjectArtifact.contentPreview` is never written. Indexing fills `path` and `metadata` (language, lines, exports). Graph artifact nodes copy `contentPreview`, which stays `null`.

## Knowledge-graph ids for persona focus

`buildKnowledgeGraph` resolves a focus string with `technologyByName`, keyed by **lowercased** `Technology.name`. A catalog hit becomes `technology:<uuid>`.

A miss mints `technology:virtual:<trimmed lowercase>` and stores that **full node id** back into the map as `id`. The next focus string that normalizes to the same key takes the catalog path and prefixes `technology:` again:

```text
first session  -> technology:virtual:scalability
second session -> technology:technology:virtual:scalability
```

Both nodes stay in `nodes`. Edges from later sessions attach to the doubled id, so `summary.topTechnologies` splits one concept across two labels. This happens inside a single `GET /knowledge-graph` whenever two sessions still have `insights.focusAreas` (typical before the first coaching answer replaces that JSON).

## Errors that are not `HttpError`

`errorHandler` uses `err.status` only when `err instanceof HttpError`. Every other error is **500** with `{ error: { message: "Internal Server Error" } }` and no `details`. The original message is written to the Pino log (`path` included).

Body-parser cases follow that rule even though they carry their own status:

| Failure | Status on the thrown error | Status the client receives |
| --- | --- | --- |
| Malformed JSON | 400 (`entity.parse.failed`) | 500 |
| Body larger than 2mb | 413 | 500 |
| `HttpError` from Zod (`Validation failed`) | 400, with `details` = Zod issues | 400 |

`POST /auth/register` and `POST /auth/login` compare emails with `email.toLowerCase()` on both write and lookup. `Ada@Example.com` and `ada@example.com` are one user. The stored `email` is the lowercased form.

## Logging and `npm run start`

`NODE_ENV` defaults to `development` when unset (`src/config/env.ts`).

| `NODE_ENV` | Pino | Prisma client |
| --- | --- | --- |
| `production` | level `info`, no transport | log `error` only |
| anything else | level `debug`, transport `pino-pretty` | in `development`, also `query` and `warn` |

`pino-pretty` is a devDependency. `npm run start` loads the logger at import time, so a production install (`npm install --omit=dev`) without `NODE_ENV=production` fails while resolving that transport. `.env.example` sets `NODE_ENV=development`.

In `development`, Prisma also prints each SQL statement (`query`). Resume ingest stores the full `resumeText` on `Insight.payload`. Treat that column as sensitive data.

## Build output

`npm run build` is `tsc -p tsconfig.json`. `tsconfig.json` sets `outDir` to `dist` and does not set `noEmit`, so the command writes `dist/`. `npm run start` runs `node --enable-source-maps dist/server.js` and does not compile.

`package.json` prisma scripts are `prisma:migrate`, `prisma:generate`, `prisma:studio`, and `prisma:deploy`. There is no `db push` script.

## Related codepaths

- `src/prompts/basePrompts.ts` (`createProjectSummaryPrompt`)
- `src/modules/projects/projectIndexing.service.ts` (`detectLanguage`, `ignoredGlobs`, `MAX_FILES_ANALYZED`)
- `src/repositories/projects/projectArtifact.repository.ts`
- `src/modules/knowledgeGraph/knowledgeGraph.service.ts` (`ensureVirtualTechnologyNode`)
- `src/middleware/errorHandler.ts`
- `src/app.ts` (`express.json({ limit: '2mb' })`)
- `src/utils/json.ts` (`parseJsonResponse` candidate order)
- `src/server.ts`
