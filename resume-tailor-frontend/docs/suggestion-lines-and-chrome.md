# Suggestion lines and studio chrome

How the resume builder turns a section suggestion into bullets, and how the shell labels providers, theme, and product name.

## Suggestion lines

`normalizeSuggestionContent` in `src/components/modules/resume/resume-builder.tsx` converts `response.content` to `string[]` before the card renders.

`extractLines`:

- strips `\r`
- replaces `•` (U+2022), `●` (U+25CF), and `▪` (U+25AA) with newlines
- splits on newlines, trims, and drops empty lines

For `skills` only, each line is then split on `,`, `/`, and `|`. Hyphens stay in the token. Summary and experience lines are not split that way.

| `content` | Section | Lines |
| --- | --- | --- |
| `"TypeScript, CI/CD, full-stack"` | skills | `TypeScript`, `CI`, `CD`, `full-stack` |
| `"TypeScript, CI/CD, full-stack"` | summary | one line |
| `["Led CI/CD"]` | skills | `Led CI`, `CD` |
| `{ "text": "Led CI/CD" }` | summary | `Led CI/CD` |

A plain object is `Object.values`, each value stringified, joined with newlines, then passed through `extractLines` again. `String` on an array joins with a comma, so a nested array is comma-separated text before the skills split.

Summary Apply joins those lines with one space. The card renders `suggestion.content.map`. An empty array is a card with no bullets.

The API can hand back the raw payload when `content` is `""` or missing. That string is what gets split. See `resume-tailor-api/docs/section-suggestion-parsing.md`.

## Provider select copy

`LlmProviderSelect` defaults `label` to `LLM Provider (optional)` and `optional` to `true`, which appends another `(optional)`. The label reads **LLM Provider (optional) (optional)**.

Blurbs in `LLM_PROVIDER_OPTIONS` (`src/lib/constants.ts`) are not the models `generate()` uses when `model` is omitted:

| Option | Blurb | Adapter default |
| --- | --- | --- |
| ollama | Fastest iteration for local-style prompting. | `https://ollama.com`, model `minimax-m2:cloud` |
| bedrock | Enterprise guardrails with Claude/Sonnet family. | `anthropic.claude-3-sonnet-20240229-v1:0`. No guardrail API. |
| google | Gemini 1.5 + Imagen for rich reasoning. | `gemini-2.5-flash`. No image API. |
| openrouter | Meta, Mistral, and experimental open models. | `qwen/qwen3-coder:free` |

## Theme leaves system mode

`AppProviders` sets `defaultTheme="system"` and `enableSystem`. The header button in `theme-toggle.tsx` writes `"light"` or `"dark"` from the resolved appearance. It never writes `"system"` again. After one click, `next-themes` keeps the explicit value (storage key `theme`).

## Dates, draft seed, unused clients

`formatDate` returns `""` when the input is missing or invalid. `TailoredAssetsCard` prints `formatDate(asset.updatedAt)`. Tailored-asset rows have `createdAt` only, so the line under each title is blank. The list is still the three newest rows (`createdAt` desc, then `.slice(0, 3)`).

`useResumeDraft` always seeds a custom section titled `Impact` with the sentence `Quantify the measurable outcomes you drove. Aim for metrics, scale, or business KPIs.` Export includes custom sections, so that placeholder is in the PDF/DOCX until the user edits or removes it. Section ids come from `createId()` (`crypto.randomUUID`, or an 8-character `Math.random` string when `crypto.randomUUID` is missing).

These helpers have no callers:

| Helper | Would call | Actual shape |
| --- | --- | --- |
| `getHealth()` | `GET /health` | `{ status, environment }` after unwrap |
| `getResume(id)` | `GET /resumes/:id` | one resume. The builder uses `GET /resumes` and keeps `data[0]`. |
| `listOllamaTags()` | `GET /llm/ollama/tags` | typed as an array. The API `data` is `{ models: [...] }`. |

## Chrome names

The document title, header wordmark, and auth card say **Experience Studio** (mark `Ex`). The API log line is `Experience API listening`. `.env.example` uses database name `experience`. Package directories stay `resume-tailor-api` and `resume-tailor-frontend`.

## Related codepaths

- `src/components/modules/resume/resume-builder.tsx`
- `src/hooks/useResumeDraft.ts`
- `src/components/llm-provider-select.tsx`
- `src/lib/constants.ts`
- `src/components/theme-toggle.tsx`
- `src/components/providers/app-providers.tsx`
- `src/components/modules/retrieval/tailored-assets-card.tsx`
- `src/services/{health,resumes,llm}.ts`
- `src/components/layout/app-shell.tsx`
- `src/app/layout.tsx`
