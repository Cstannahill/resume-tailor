# Model catalog error bodies

`GET /llm/models` and `GET /llm/models/:provider` are not behind `authenticate`. A failed provider fetch is still HTTP 200. The `message` string on that JSON is the thrown `Error.message`, cached in the process for 10 minutes.

Sources: `src/routes/llm.routes.ts`, `src/modules/llm/llm.controller.ts`, `src/modules/llm/llm.service.ts`, `src/adapters/llm/ollama.tags.ts`. `node-fetch` is locked at `3.3.2`.

## Where the Google key is placed

`fetchGoogleModels` builds this URL with the raw env value:

```text
https://generativelanguage.googleapis.com/v1beta/models?key=<GOOGLE_GENAI_API_KEY>
```

Two different failures follow.

| Failure | `message` contents |
| --- | --- |
| HTTP response with a non-OK status | `Failed to fetch Google GenAI models: <status> <body>`. The request URL is not copied. |
| `fetch()` throws before a response (DNS, connection reset, invalid URL) | node-fetch `3.3.2` rejects with `request to <url> failed, reason: <cause>`. `<url>` is the string above, including the key. |

`listProviderModels` catches that error and stores it:

```json
{
  "provider": "google",
  "models": [],
  "status": "error",
  "message": "request to https://generativelanguage.googleapis.com/v1beta/models?key=<GOOGLE_GENAI_API_KEY> failed, reason: ..."
}
```

`GET /llm/models` returns that object inside the four-provider array. `GET /llm/models/google` returns it as `data`. Both stay cached until `cachedUntil` (10 minutes from the failure). The catch path does not log. Restarting the process drops the cache. The HTTP handlers never pass `forceRefresh`.

A missing `GOOGLE_GENAI_API_KEY` throws before `fetch`, so that message is `Google model listing currently requires OAuth; API key listing is disabled.` and does not contain a key.

## Other catalog fetches

Ollama and OpenRouter send the API key on `Authorization`. Their URLs are `{base}/api/tags` and `{base}/models`. A thrown `fetch()` still embeds the URL in `Error.message`, and that string is cached on the catalog the same way, without the bearer token. A non-OK HTTP status copies the response body into `Failed to fetch Ollama tags: …` or `Failed to fetch OpenRouter models: …`.

Ollama's tag cache (`getOllamaTags`, 5 minutes) stores successful payloads only. A throw is not written there. The catalog cache still keeps the error for 10 minutes and will not call `getOllamaTags` again until that entry expires.

`GET /llm/ollama/tags` does not use the catalog wrapper. A throw there is a generic `Error`, so the client sees 500 `Internal Server Error` and the key is not in that URL.

The studio model cards do not render `message`. The JSON body still has it. `curl` with no `Origin` is allowed by the CORS callback; a browser `Origin` outside `ALLOWED_ORIGINS` fails in CORS and never reaches this handler.
