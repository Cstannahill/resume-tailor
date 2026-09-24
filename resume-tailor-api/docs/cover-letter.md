# JSON Collateral Responses

The JSON-based LLM prompts (cover letters, resume sections, job insights, persona drills) now share consistent formatting guidance and parsing.

## Prompting expectations

- Every `Return/Respond STRICT JSON` prompt in `src/prompts/basePrompts.ts` now includes an explicit *Formatting Rules* section instructing the model to emit raw JSON only (no code fences or commentary).
- The cover-letter schema remains `{ content, projectHighlights, resumeBullets, alignmentNotes }`. Resume extraction, section generation/improvement, conversation evaluations, and job-description analyses preserve their schemas as well.

## Parsing helper

- `src/utils/json.ts` exposes `parseJsonResponse`, which trims responses, strips fenced blocks, and extracts a JSON object or array slice before calling `JSON.parse`.
- Retrieval, resume, conversation, and job-intelligence services use this helper so fenced or padded responses still deserialize, while unstructured outputs fall back to previous text-based flows.

## Extractor constraints

Candidates are tried in order: the trimmed payload, the first fenced block, the slice from the first `{` through the last `}`, then the slice from the first `[` through the last `]`. The first value `JSON.parse` accepts is returned.

Those brace and bracket slices are greedy. Commentary that adds another brace after a valid object makes the object slice fail. A valid inner object is accepted before a surrounding array is considered. Details and the other indexing/HTTP pitfalls are in `docs/indexing-sample-and-http-errors.md`.

This keeps backend data consistent even if a provider briefly ignores the formatting instruction.
