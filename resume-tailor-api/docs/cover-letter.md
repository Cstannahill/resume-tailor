# JSON Collateral Responses

The JSON-based LLM prompts (cover letters, resume sections, job insights, persona drills) now share consistent formatting guidance and parsing.

## Prompting expectations

- Every `Return/Respond STRICT JSON` prompt in `src/prompts/basePrompts.ts` now includes an explicit *Formatting Rules* section instructing the model to emit raw JSON only (no code fences or commentary).
- The cover-letter schema remains `{ content, projectHighlights, resumeBullets, alignmentNotes }`. Resume extraction, section generation/improvement, conversation evaluations, and job-description analyses preserve their schemas as well.

## Parsing helper

- `src/utils/json.ts` exposes `parseJsonResponse`, which trims responses, strips ```json fences, and extracts the first JSON object/array block before calling `JSON.parse`.
- Retrieval, resume, conversation, and job-intelligence services use this helper so fenced or padded responses still deserialize. Unstructured outputs fall back to text-based defaults in those modules.
- Developer baseline reports (`src/modules/profile/profile.service.ts`) also parse with this helper, but they **do not** fall back: unparseable JSON fails the request.

This keeps backend data consistent even if a provider briefly ignores the formatting instruction.
