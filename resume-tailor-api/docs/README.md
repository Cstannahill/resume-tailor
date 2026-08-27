# API documentation index

Source-backed notes for the Express API. Payload catalogs live in `frontend.md`; this folder also has workflow and operational runbooks.

| Doc | Use it for |
| --- | --- |
| [`frontend.md`](./frontend.md) | Route catalog, auth, payload shapes |
| [`frontendv2.md`](./frontendv2.md) | Resume-section generate/improve/patch and developer reports |
| [`cover-letter.md`](./cover-letter.md) | Shared JSON prompt/parsing for LLM collateral |
| [`knowledge-graph.md`](./knowledge-graph.md) | Graph construction, public scoping, artifact volume |
| [`resume-ingestion.md`](./resume-ingestion.md) | Regex seed + LLM merge ingest pipeline |
| [`conversation-sessions.md`](./conversation-sessions.md) | Persona session lifecycle and insight overwrite |
| [`job-intelligence.md`](./job-intelligence.md) | JD analysis and language-vs-library matching |
| [`auth-and-settings.md`](./auth-and-settings.md) | JWT/CORS, settings field mismatch, unused decrypt |
| [`llm-generation.md`](./llm-generation.md) | Adapter defaults; catalogs are display-only |
| [`data-model.md`](./data-model.md) | Prisma models, enums, cascade behavior |

Frontend client pitfalls (settings keys, catalog shape, graph `userId`) are in `../resume-tailor-frontend/docs/client-architecture.md`.
