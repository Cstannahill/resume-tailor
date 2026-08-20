# Project indexing

`POST /projects/index` clones or reads a source tree, scores a bounded set of files, asks an LLM for a summary, then upserts a `Project` plus artifacts, technologies, and insights.

Source of truth: `src/modules/projects/projectIndexing.service.ts`, `src/routes/project.routes.ts`.

## Request

Auth required. `userId` / owner is taken from the JWT (`handleIndexProject` overwrites it).

```json
{
  "name": "Resume Tailor API",
  "description": "Optional UI blurb",
  "source": {
    "kind": "github",
    "repoUrl": "https://github.com/org/repo",
    "branch": "main",
    "shallow": true
  },
  "tags": ["api"],
  "llmProvider": "ollama"
}
```

Local source: `{ "kind": "local", "path": "/absolute/path/to/dir" }`. The path must exist and be a directory (`400` otherwise).

| Field | Constraint |
| --- | --- |
| `name` | Required, non-empty |
| `source.kind` | `github` or `local` |
| `source.repoUrl` | Required for GitHub; must be a URL |
| `source.shallow` | Defaults to **true** (`--depth 1`) |
| `llmProvider` | Optional; otherwise `DEFAULT_LLM_PROVIDER` |

Response `201`: `{ project, heuristics, summary }`.

## Pipeline

```text
resolve source root
        |
analyze up to 250 source files (heuristics)
        |
LLM summary (maxOutputTokens 400)
        |
upsert Project by repoUrl or localPath
        |
replace artifacts + sync technologies + write insights
        |
delete GitHub temp clone
```

### Source resolution

- **Local**: uses the given path in place. No copy, no cleanup.
- **GitHub**: clones into `os.tmpdir()/project-<uuid>`. Branch is passed as `--branch` when set. Cleanup always runs in `finally`.

Clone failures become `HttpError` with `details.repoUrl`, `details.gitMessage`, and `details.suggestion`:

| Signal | Status | Suggestion in `details` |
| --- | --- | --- |
| HTTP 404 / "repository not found" | 404 | Repo may be private or missing |
| HTTP 401 / auth text | 401 | Provide credentials or use a public repo |
| HTTP 5xx | 5xx | Retry later |
| Other git errors | 502 | Verify the URL |

The API does not inject GitHub credentials. Private repos fail unless the host already has git credentials.

### Heuristics

`fast-glob` walks:

- `**/*.{ts,tsx,js,jsx,py,rb,go,java,cs,php,rs,kt,swift,scala,cpp,c,h}`
- `**/package.json`, `**/requirements.txt`, `**/pyproject.toml`

Ignored: `node_modules`, `dist`, `build`, `.git`, lockfiles, `*.min.*`.

Hard cap: **250 files**. Language is inferred from extension. Exports are regex-detected (`export const|class|function|interface|type`). `keyFunctionality` keeps the first 20 files that had exports.

### Persistence

`upsertProject` finds an existing row by `id`, `repoUrl`, or `localPath` **globally** (not per owner). Re-indexing the same GitHub URL updates that row and can change `ownerId`.

Artifacts written (`replaceProjectArtifacts`):

| `kind` | Contents |
| --- | --- |
| `source_file` | One per analyzed file: path, language, LOC, exports |
| `heuristic` | Metrics, highlights, key functionality |
| `summary` | LLM summary text |

Two insights are stored:

- `source: project-index`, `layer: raw` — heuristics payload. `userId` is the JWT user, or `"system"` if unowned.
- `source: project-summary`, `layer: derived` — summary payload.

Those sources do **not** contain `conversation`, so they land in user-context `additionalInsights`, not persona insights.

## Reads

- `GET /projects` is public. `mine=true` requires a token and filters to the caller. `ownerId` is an explicit filter. Technology filter is exact (`technologies` array `has` the query string).
- `GET /projects/:projectId` is public when `ownerId` is null. Owned projects return `403` unless the bearer matches.

## Pitfalls

- Local indexing only works for directories the **API process** can read (the Next.js app cannot upload a folder).
- Shallow clones miss history; omit `shallow` or set `"shallow": false` if you need a full clone.
- The 250-file cap means large monorepos are sampled, not fully scored.
- Re-indexing a URL already used by another user overwrites that project row.
- LLM adapter credentials come from **process env**, not `/settings/provider-keys`.
