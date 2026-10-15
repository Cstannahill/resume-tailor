# LLM call budgets and provider failures

Every generation path calls `getLLMAdapter(provider)` and then `adapter.generate()`. No caller passes `model` or `temperature`. The model id and sampling temperature are whatever that adapter hardcodes. Output caps differ by provider even when the caller sets `maxOutputTokens`.

## Output caps by workflow

| Workflow | Caller | `maxOutputTokens` |
| --- | --- | --- |
| Repository summary | `summarizeProject` | 400 |
| Resume ingest enrichment | `requestEnrichedInsight` | 600 |
| Section generate / improve | `generateResumeSection`, `improveResumeSection` | 500 |
| Persona question | `generatePersonaQuestion` | 300 |
| Answer evaluation | `evaluateAnswer` | 500 |
| Job tailoring | `tailorJobMaterials` | 600 |
| Job description analysis | `analyzeJobDescription` | 600 |
| Developer report | `generateDeveloperProfile` | 700 |

`BedrockAdapter`, `GoogleGenAiAdapter`, and `OpenRouterAdapter` send that value (`maxTokens`, `maxOutputTokens`, or `max_tokens`). If a caller omitted it, those three would default to **512**. Current callers always set it, so the live cap is the table above.

`OllamaAdapter` does not send a max-token field. The table does not apply to Ollama. It posts to `{OLLAMA_BASE_URL}/v1/chat/completions` (default base `https://ollama.com`) with `temperature: 0.3` and `stream: false`. The other adapters use temperature **0.5** and ignore `stream`.

Default model ids when `params.model` is omitted:

| Provider | Model id |
| --- | --- |
| Ollama | `minimax-m2:cloud` |
| Bedrock | `anthropic.claude-3-sonnet-20240229-v1:0` |
| Google | `gemini-2.5-flash` |
| OpenRouter | `qwen/qwen3-coder:free` |

## How each adapter treats an empty reply

| Provider | Empty or failed content |
| --- | --- |
| Ollama | `choices` is an array but the first message has no content → `""`, and the caller hits its JSON fallback. `choices` missing entirely throws before that default. HTTP failure throws `Ollama request failed: <status> <body>` (generic `Error`, client sees 500). Missing `OLLAMA_API_KEY` throws before the request. |
| Bedrock | `output.message.content` missing → the string `No response generated.` An empty part list joins to `""` (`??` does not replace an empty string). Either value is stored or parsed as model text. |
| Google | `result.response.text() ?? ''` does not catch. A throw from `text()` becomes a 500; `?? ''` runs only when the return value is nullish. Only the **first** `system` message is sent as `systemInstruction`. Later system messages are dropped. Missing `GOOGLE_GENAI_API_KEY` throws `Missing GOOGLE_GENAI_API_KEY`. |
| OpenRouter | Empty or non-string `content` throws `OpenRouter returned empty response body: <json>`. That is a 500, not a parse fallback. Missing `OPENROUTER_API_KEY` throws `Missing OPENROUTER_API_KEY`. |

OpenRouter also sends `HTTP-Referer: https://experience-api.local` and `X-Title: Experience API`. Base URL defaults to `https://openrouter.ai/api/v1`.

Bedrock's `BedrockRuntimeClient` is constructed when `bedrock.adapter.ts` loads, not on the first request. Region is `BEDROCK_REGION` or `us-east-1`. Access keys are set only when both `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are present; otherwise the AWS SDK default chain is used. `getLLMAdapter` caches one adapter instance per provider for the process lifetime. Restart to pick up a region or credential change for Bedrock.

System prompts are passed through as chat messages for Ollama and OpenRouter. Bedrock lifts **every** system message into Converse `system` blocks.

## Repository summary is not parsed

`createProjectSummaryPrompt` asks for JSON keys `executiveSummary`, `architecture`, `metrics`, `risks`, and `nextSteps`. `summarizeProject` stores `response.content` on `Project.summary` with no `parseJsonResponse`. On Bedrock, Google, and OpenRouter the 400-token cap can cut that JSON off mid-string. Ollama can return the full text because it ignores the cap. Tailoring (`createJobTailoringPrompt`) and `describeProject` in `collectUserContext` embed that stored string unchanged.

## Model catalog cache

`GET /llm/models` and `GET /llm/models/:provider` call `listProviderModels` without `forceRefresh`. Successful catalogs and **error** catalogs stay in memory for **10 minutes** (`cachedUntil`). A bad key or upstream 401 is returned as HTTP 200:

```json
{
  "data": {
    "provider": "openrouter",
    "models": [],
    "cachedUntil": 1760000000000,
    "status": "error",
    "message": "OPENROUTER_API_KEY is required to list OpenRouter models."
  }
}
```

`cachedUntil` is epoch milliseconds. The number above is only a shape example.

Success payloads omit `status`. `GET /llm/models` always fetches all four providers in parallel and returns an array of those objects. There is no query flag to bust the cache.

Ollama tags use a second cache of **5 minutes** inside `getOllamaTags`. The catalog fetcher does not pass `forceRefresh` into that cache. `GET /llm/ollama/tags` does not catch provider errors, so a missing key or upstream failure there is a 500. The catalog route wraps the same failure as `status: "error"`.

Google's missing-key path throws `Google model listing currently requires OAuth; API key listing is disabled.` When the key is present, the catalog calls `https://generativelanguage.googleapis.com/v1beta/models?key=...` and copies the upstream `name` (typically `models/gemini-2.5-flash`). Generation does not rewrite that string, and the adapter default has no `models/` prefix.

Bedrock catalog `name` is `modelId`, `description` is `modelName`, and `tags` is a one-element array containing `modelArn`. OpenRouter sets `isFree` only when `pricing.prompt` is the string `"0"`.
