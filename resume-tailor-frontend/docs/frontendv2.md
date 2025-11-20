# Frontend Integration Notes (v2 Enhancements)

This addendum tracks the latest resume-section editing APIs so the React workspace can iterate quickly without diffing the entire backend.

## Auth Reminder

All resume endpoints require a valid JWT (`Authorization: Bearer <token>`). Reuse the existing `/auth/login` flow documented in `frontend.MD`.

## Resume Section Workflows

### 1. Generate a New Section

Use when the user wants brand-new bullets/summary/skills for a given experience or section.

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

- `:section` is one of `summary | skills | experiences | education | contact`.
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
- Frontend: show the bullets + rationale, offer “Apply” to persist (see PATCH below).

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

- Response mirrors the `generate` endpoint with improved `content` + `rationale`.
- Use when the user edits inline and wants “Make this better” behavior.

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

- The backend maps sections to the correct DB fields:
  - `summary` → `extractedSummary` (string)
  - `skills` → `string[]`
  - `experiences` → array of `{ company?, role?, achievements[] }`
  - `education` → array of entries
  - `contact` → object `{ email?, phone?, ... }`
- PATCH returns the updated resume record; re-fetch `/resumes/:id` if you need a full refresh.

## UX Flow Suggestions

1. **Load current resume** via `GET /resumes/:id` and allow inline editing per section.
2. **“Generate suggestions”** button calls `/generate`, shows returned bullets/summary with rationale tag (“AI suggestion”).
3. **“Improve existing”** button sends the current content and displays the LLM’s rewrite side-by-side.
4. **Apply** uses `PATCH` to persist; re-sync local state with response.
5. Track `experienceIndex` if the user reorders experiences; pass the index to provide context to the LLM.

## Error Handling

- Invalid `:section` → backend returns `400`.
- Missing resume or trying to edit someone else’s resume → `403/404`.
- LLM failures still return 200 with `content` fallback (raw text) and `rationale` describing parse issues.

Keep `frontend.MD` as the canonical reference for legacy routes; use this addendum only for the new resume-section editing surface. Update your client services accordingly.***
