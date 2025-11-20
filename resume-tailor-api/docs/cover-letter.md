# JSON Collateral Responses

The JSON-based LLM prompts (cover letters, resume sections, job insights, persona drills) now share consistent formatting guidance and parsing.

## Prompting expectations

- Every `Return/Respond STRICT JSON` prompt in `src/prompts/basePrompts.ts` now includes an explicit *Formatting Rules* section instructing the model to emit raw JSON only (no code fences or commentary).
- The cover-letter schema remains `{ content, projectHighlights, resumeBullets, alignmentNotes }`. Resume extraction, section generation/improvement, conversation evaluations, and job-description analyses preserve their schemas as well.

## Parsing helper

- `src/utils/json.ts` exposes `parseJsonResponse`, which trims responses, strips ```json fences, and extracts the first JSON object/array block before calling `JSON.parse`.
- Retrieval, resume, conversation, and job-intelligence services now use this helper so fenced or padded responses still deserialize, while unstructured outputs fall back to previous text-based flows.

This keeps backend data consistent even if a provider briefly ignores the formatting instruction.
