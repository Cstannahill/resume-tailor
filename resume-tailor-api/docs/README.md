# Docs index (this branch)

Additive runbooks for gaps that open drafts #11–#15 do not cover. Prefer merging #11, then #12, then #13, then #14, then #15, then this PR. If this lands after those drafts, combine this index with theirs.

## On this branch

| Doc | Covers |
| --- | --- |
| [project-read-authorization.md](./project-read-authorization.md) | Public `GET /projects` vs 403 on `GET /projects/:id`; full-row leak including `insights.files` and `localPath` |
| [frontend.md](./frontend.md) | Integration notes (corrected project/ingest/job/graph request shapes) |
| [frontendv2.md](./frontendv2.md) | Resume section generate / improve / PATCH |
| [cover-letter.md](./cover-letter.md) | Shared JSON collateral parsing |

Frontend counterparts:

- `../resume-tailor-frontend/docs/export-and-deliverables.md`
- `../resume-tailor-frontend/docs/cover-letter-studio-handoff.md`

## Already on `main`

Root and package READMEs, plus the files above. Drafts #11–#15 add setup, indexing, graph/ingest/settings/LLM, retrieval/studio shapes, and auth/conversation contracts — do not copy those here.
