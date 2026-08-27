# LLM generation and catalogs

Every LLM write path constructs an adapter with `getLLMAdapter(llmProvider?)` and calls `generate()`. Catalog endpoints are independent of generation.

Sources: `src/adapters/llm/*`, `src/modules/llm/llm.service.ts`.

## Runtime credentials

Adapters are process singletons keyed by provider. They read **environment variables only**:

| Provider | Required env | Chat endpoint / SDK |
| --- | --- | --- |
| `ollama` | `OLLAMA_API_KEY` (`OLLAMA_BASE_URL` default `https://ollama.com`) | `POST {base}/v1/chat/completions` |
| `bedrock` | AWS creds + `BEDROCK_REGION` via `buildBedrockConfig()` | Bedrock Runtime `Converse` |
| `google` | `GOOGLE_GENAI_API_KEY` | `@google/generative-ai` |
| `openrouter` | `OPENROUTER_API_KEY` (`OPENROUTER_BASE_URL` optional) | OpenAI-style `/chat/completions` |

Missing keys throw generic `Error` values from the adapter (typically **500** on a generate route). `/settings/provider-keys` and `UserSetting.defaultLlmProvider` are not consulted.

No service passes `params.model`. The UI `LlmProviderSelect` only sends `llmProvider`. Hardcoded defaults:

| Provider | Default model | Default temperature |
| --- | --- | --- |
| ollama | `minimax-m2:cloud` | 0.3 |
| bedrock | `anthropic.claude-3-sonnet-20240229-v1:0` | 0.5 |
| google | `gemini-2.5-flash` | 0.5 |
| openrouter | `qwen/qwen3-coder:free` | 0.5 |

OpenRouter also sends `HTTP-Referer: https://experience-api.local` and `X-Title: Experience API`. Empty content throws.

`maxOutputTokens` is set per workflow (indexing 400, resume extract 600, sections 500, tailor 600, job intel 600, persona question 300, evaluation 500, developer report 700). Ollama's chat payload currently does not send `max_tokens`.

## Catalogs (display only)

Public routes, in-process cache:

| Route | Cache | Notes |
| --- | --- | --- |
| `GET /llm/models` | 10 minutes per provider | Array of `{ provider, models, cachedUntil, status?, message? }` |
| `GET /llm/models/:provider` | same | Single catalog object (not an array) |
| `GET /llm/ollama/tags` | 5 minutes | `{ models: [...] }`; requires `OLLAMA_API_KEY` |

Fetcher failures are cached as `{ status: "error", models: [] }` for the same TTL — a bad key keeps the catalog empty for 10 minutes.

Google listing uses the Generative Language `models?key=` URL when `GOOGLE_GENAI_API_KEY` is set. If the key is missing, the thrown message still says listing "requires OAuth; API key listing is disabled."

OpenRouter `isFree` is true only when `pricing.prompt === "0"` (string).

### Frontend shape mismatch

`listLlmModels()` types the response as `LlmModelMetadata[]`.

- **All providers:** the API returns **catalog objects**. The panel treats each catalog as a model (`name` undefined, `provider` set).
- **One provider:** the API returns **one object**. `Array.isArray` is false, so the UI shows "No models returned."

Clicking a catalog card does not change generation. There is no `model` field on ingest/tailor/conversation bodies.

## Related codepaths

- `src/adapters/llm/llm.factory.ts`
- `src/adapters/llm/{ollama,bedrock,google,openrouter}.adapter.ts`
- `src/modules/llm/llm.{controller,service}.ts`
- `resume-tailor-frontend/src/components/modules/llm/llm-model-catalog.tsx`
- `resume-tailor-frontend/src/services/llm.ts`
