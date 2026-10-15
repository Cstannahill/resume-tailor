# API docs (this branch)

Verified against `main` at `0121ce6`. These pages are additive to the open documentation PRs. When merging, fold this table into the indexes from those branches instead of keeping two `docs/README.md` files.

| Guide | What it covers |
| --- | --- |
| [llm-call-budgets.md](./llm-call-budgets.md) | Per-workflow `maxOutputTokens`, Ollama ignoring that cap, empty-reply behavior, Bedrock client lifetime, catalog error cache |
| [indexing-signals.md](./indexing-signals.md) | Extension → technology strings, export regex, highlight wording, re-index write order |
| [auth-status-mapping.md](./auth-status-mapping.md) | Optional vs required auth, login/register error collapse, display-name wipe, provider-key delete status |

Studio behavior for the same calls is in `resume-tailor-frontend/docs/client-failure-surfaces.md`.
