# Frontend Integration Notes (v2 Enhancements)

This addendum tracks resume-section editing and developer-report APIs so the React workspace can iterate without diffing the entire backend.

## Auth Reminder

All resume and profile endpoints in this addendum require a valid JWT (`Authorization: Bearer <token>`). Reuse `/auth/login` from `frontend.md`. The API derives `userId` from the token.

## Resume Section Workflows

`:section` is one of `summary | skills | experiences | education | contact`. Unsupported values return `400`.

### 1. Generate a New Section

```
POST /resumes/:resumeId/sections/:section/generate
Body:
{
  "context": {
    "jobTitle": "Senior Frontend Engineer",
    "company": "Acme Corp",
    "experienceIndex": 0,
    "achievements": [
      "Led migration from CRA to Next.js",
      "Improved TTFB by 40%"
    ],
    "skills": ["React", "TypeScript", "Next.js"],
    "notes": "Focus on performance & leadership"
  },
  "llmProvider": "ollama",
  "tone": "concise"
}
```

- Response
  ```json
  {
    "data": {
      "section": "experiences",
      "content": [
        "Spearheaded the CRA → Next.js migration, cutting TTFB by 40% and halving deploy times.",
        "Mentored 4 engineers on React performance patterns, reducing bundle size by 25%."
      ],
      "rationale": "Highlights measurable outcomes and leadership"
    }
  }
  ```
- Show bullets + rationale, then persist with PATCH.
- The server auto-enriches prompts from stored resume/project/persona data. Send only UI deltas.

### 2. Improve Existing Content

```
POST /resumes/:resumeId/sections/:section/improve
Body:
{
  "context": {
    "jobTitle": "Backend Engineer",
    "company": "Example Inc",
    "notes": "Highlight scalability + metrics"
  },
  "currentContent": [
    "Worked on microservices.",
    "Improved APIs."
  ],
  "instructions": "Add concrete metrics & technologies",
  "llmProvider": "bedrock"
}
```

- Response mirrors generate (`content` + `rationale`).
- Use when the user edits inline and wants a rewrite.

### 3. Persist Section Updates

```
PATCH /resumes/:resumeId/sections/:section
Body:
{
  "content": [
    "Optimized payments flow, cutting checkout time by 35%.",
    "Introduced feature flags via LaunchDarkly, reducing rollback time from hours to minutes."
  ]
}
```

Field mapping:

| Section | Stored field | Shape |
| --- | --- | --- |
| `summary` | `extractedSummary` | string |
| `skills` | `skills` | `string[]` |
| `experiences` | `experience` | `{ company?, role?, achievements[] }[]` |
| `education` | `education` | array of entries |
| `contact` | `contact` | `{ email?, phone?, ... }` |

PATCH returns the updated resume record.

## User Context Aggregation

`collectUserContext` (`src/modules/profile/userContext.service.ts`) is shared by resume-section suggestions and developer baseline reports. Details and limits are in `../resume-tailor-api/docs/user-context.md`.

Client implications:

- For generate/improve, send only task-specific `context` fields (`jobTitle`, `company`, `experienceIndex`, `achievements`, `notes`).
- Existing client values win. If the UI sends `skills` or `summary`, the API does not overwrite them.
- Composed snapshot notes are **appended** to `context.notes`. Keep user notes concise.

## Developer Baseline Report

```
POST /profiles/developer-report
Body:
{
  "llmProvider": "openrouter"
}
```

- Auth required. `userId` comes from the JWT.
- Expected JSON: `developerOverview`, `coreStrengths`, `growthOpportunities`, `projectEvidence`, `technicalDepth`, `riskCaveats`, `confidence` (`low | medium | high`).
- Parse failures throw; unlike resume-section routes, this endpoint does **not** return a raw-text fallback.

## Error Handling

- Invalid `:section` → `400`.
- Missing resume or another user's resume → `404` / `403`.
- Resume-section LLM parse failures still return `200` with raw `content` and a `rationale` describing the parse issue.
- Developer-report LLM parse failures return an API error (`LLM returned unstructured developer profile.`).

Keep `frontend.md` as the canonical reference for other routes. Use this addendum for resume-section editing, context enrichment, and developer baseline reports.
