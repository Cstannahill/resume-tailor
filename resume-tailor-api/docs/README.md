# API documentation index

Source-backed notes for the Express API. Payload catalogs live in `frontend.md`; this folder also has workflow runbooks.

This branch adds identity, session, and conversation **client-contract** notes that open drafts #11–#14 do not cover. Prefer merging #11, then #12, then #13, then #14, then this PR. If this lands after those drafts, combine the `docs/README.md` tables.

| Doc | Use it for |
| --- | --- |
| [`frontend.md`](./frontend.md) | Route catalog, auth, payload shapes |
| [`frontendv2.md`](./frontendv2.md) | Resume-section generate/improve/patch and developer reports |
| [`cover-letter.md`](./cover-letter.md) | Shared JSON prompt/parsing for LLM collateral |
| [`auth-identity-and-sessions.md`](./auth-identity-and-sessions.md) | `name` vs `displayName`, password 6 vs 8, stale localStorage, 401 ≠ logout, CORS 500 |
| [`conversation-client-contract.md`](./conversation-client-contract.md) | Prisma vs studio session/response shapes, stale respond snapshot, no list API |

Studio-side counterparts: `../resume-tailor-frontend/docs/auth-and-coach-contracts.md`.
