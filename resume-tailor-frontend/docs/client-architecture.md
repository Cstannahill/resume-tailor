# Frontend client architecture

How the Next.js workspace talks to the API, where session state lives, and which UI contracts do not match the backend.

There is no frontend `.env.example`. Next.js reads `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:4000` in `src/lib/constants.ts`). Put overrides in `.env.local`. CORS must allow the studio origin (`CORS_ALLOWED_ORIGINS` on the API, default `http://localhost:3000`).

## API client

`src/lib/api-client.ts`:

- Prefixes paths with `API_BASE_URL` unless the path is already `http`.
- Attaches `Authorization: Bearer` from localStorage when a token exists.
- Unwraps `{ data }` on JSON success.
- On HTTP 401, throws `Error("Unauthorized")` with `code = 401` **before** parsing the body (auth context then clears storage).
- Non-JSON success returns `response.text()`.

React Query (`app-providers.tsx`): queries stale after 60s, no refetch on window focus, one retry. Mutations do not retry.

## Auth storage

Keys: `experience:auth-token`, `experience:auth-user` (`src/lib/auth-storage.ts`).

On load, `AuthProvider` uses the **cached user JSON** if a token exists and does **not** call `/auth/me` unless `refreshProfile()` runs. An expired JWT can look signed-in until the next 401. Tokens expire in 1 day (API default).

## Settings vs API

The settings page PUT/GET field names do not match `/settings`:

| UI (`UserSettings`) | API |
| --- | --- |
| `defaultProvider` | `defaultLlmProvider` |
| `notifications.jobMatches` / `productUpdates` | `notificationPrefs` |
| provider key `lastFour` | not returned (`configured: true` only) |

Zod strips unknown keys, then the API stores `null` for omitted settings fields. Toggling "default provider" or notification checkboxes clears server-side settings. After reload the select shows `ollama`. Last-four digits exist only in component state until refresh.

Saved provider keys are not used for LLM calls. Per-request `llmProvider` selects an adapter that reads process env.

## Knowledge graph

`fetchKnowledgeGraph()` GETs `/knowledge-graph` with no query string. Resume and persona nodes are therefore **unscoped**; project/artifact nodes are always global. Pass `?userId=` if you need a per-user slice (projects still leak). Artifact nodes scale with indexed file count — the d3 view does not paginate.

## Model catalog

`GET /llm/models` returns provider **catalogs**, not a flat `LlmModelMetadata[]`. `GET /llm/models/:provider` returns one catalog object. The catalog card UI therefore shows empty/wrong rows and never sends a `model` into generate APIs. Hardcoded adapter defaults apply (see API `docs/llm-generation.md`).

## Related codepaths

- `src/lib/{api-client,auth-storage,constants}.ts`
- `src/contexts/auth-context.tsx`
- `src/components/modules/settings/settings-panel.tsx`
- `src/components/modules/knowledge-graph/graph-panel.tsx`
- `src/components/modules/llm/llm-model-catalog.tsx`
- `src/services/{settings,llm,knowledge-graph}.ts`
