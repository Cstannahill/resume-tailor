# Frontend Integration Notes

Use this document as the source of truth for building React clients against the Experience API. All responses follow `{ "data": T }` on success or `{ "error": { "message": string, "details"?: unknown } }` on failure. Send and accept JSON (`Content-Type: application/json`).

- **Base URL**: `http://localhost:4000` (configurable)
- **LLM Providers**: `ollama | bedrock | google | openrouter` (optional per request; backend defaults to `DEFAULT_LLM_PROVIDER`)
- **Auth**: JWT bearer token (register/login before calling protected routes)

## Shared Patterns

- Validate request bodies client-side; backend uses `zod` and returns 400 with issue details.
- Authenticated write routes derive ownership from the JWT. Do not send `userId` in resume, retrieval, job-intelligence, or profile bodies.
- Query params (`search`, `technology`, `ownerId`, `mine`, `userId`, etc.) are optional; omit keys when not used.
- All identifiers are UUID strings; persist them in client state/routing.

## Health

| Route     | Method | Description             | Response                                                       |
| --------- | ------ | ----------------------- | -------------------------------------------------------------- |
| `/health` | GET    | Verify API availability | `{ "data": { "status": "ok", "environment": "development" } }` |

## Projects Module

- **POST** `/projects/index` *(auth required)*
  ```json
  {
    "name": "Repo Display Name",
    "description": "Optional summary shown in UI",
    "source": {
      "kind": "github",
      "repoUrl": "https://github.com/org/repo",
      "branch": "main",
      "shallow": true
    },
    "tags": ["frontend", "ai"],
    "llmProvider": "ollama"
  }
  ```
  - Local indexing uses `{ "kind": "local", "path": "C:\\projects\\sample" }`.
  - Response includes `{ project, heuristics, summary }`.

- **GET** `/projects?search=api&technology=TypeScript&mine=true`

  - Public by default.
  - Set `mine=true` with a bearer token to restrict to the current user.
  - `ownerId=<uuid>` is also supported when building admin/debug tooling.

- **GET** `/projects/:projectId`

  - Public for unowned projects.
  - Returns `403` for an owned project when the requester is unauthenticated or not the owner.

## Resumes Module

- **POST** `/resumes/ingest` *(auth required)*
  ```json
  {
    "resumeText": "Plaintext or OCR output...",
    "sourceName": "May 2024 resume.pdf",
    "llmProvider": "google"
  }
  ```
- Response: `{ record: Resume, insight: ResumeInsight }`

- **GET** `/resumes` *(current user)*
- **GET** `/resumes/:resumeId`

## Conversations (persona coaching)

- **POST** `/conversations/session` *(auth required)* to start.
- **POST** `/conversations/session/:sessionId/respond` *(auth required)*:
  ```json
  {
    "userAnswer": "Detailed reasoning",
    "thoughtProcess": "Optional reflection",
    "llmProvider": "openrouter"
  }
  ```
- **GET** `/conversations/session/:sessionId` *(auth required)*

## Retrieval (tailored assets)

- **POST** `/retrieval/tailor` *(auth required)* to generate resume/cover-letter-style content with structured recommendations.
  ```json
  {
    "jobTitle": "Senior React Engineer",
    "jobDescription": "Full JD text...",
    "resumeId": "uuid-from-resume",
    "projectIds": ["project-uuid-1", "project-uuid-2"],
    "assetType": "cover_letter",
    "llmProvider": "ollama"
  }
  ```
- **GET** `/retrieval/tailored` *(auth required)* to list previous assets.

## Knowledge Graph API

Visualize the relationship between projects, resumes, technologies, artifacts, and persona focus areas.

- **GET** `/knowledge-graph?userId=user-123`

  - Public read route.
  - Pass `userId` explicitly to scope the graph to one user. Omitting it builds a graph across available records; it does not infer scope from the JWT.

- Response:
  ```json
  {
    "data": {
      "nodes": [
        { "id": "project:123", "type": "project", "label": "Repo Name", "metadata": { "summary": "...", "technologies": ["React"] } },
        { "id": "technology:abc", "type": "technology", "label": "React", "metadata": { "category": "frontend" } },
        { "id": "artifact:xyz", "type": "artifact", "label": "heuristic", "metadata": { "path": "src/App.tsx" } },
        { "id": "persona:789", "type": "persona", "label": "backend-node" }
      ],
      "edges": [
        { "id": "edge:tech-project:abc:123", "source": "technology:abc", "target": "project:123", "type": "technology_to_project" },
        { "id": "edge:project-artifact:123:xyz", "source": "project:123", "target": "artifact:xyz", "type": "project_to_artifact" },
        { "id": "edge:persona-tech:789:abc", "source": "persona:789", "target": "technology:abc", "type": "persona_focus" }
      ],
      "summary": {
        "projectCount": 5,
        "resumeCount": 2,
        "personaCount": 3,
        "technologyCount": 10,
        "artifactCount": 12,
        "topTechnologies": [{ "name": "React", "connections": 4 }]
      }
    }
  }
  ```
- UI ideas: render force-directed graphs, filter by node type, surface `summary.topTechnologies` in dashboards.

## Job Intelligence

Upload/paste job descriptions to extract insights and compare against stored assets.

- **POST** `/intelligence/job` *(auth required)*
  ```json
  {
    "jobDescription": "Full job description text...",
    "llmProvider": "google"
  }
  ```
- Response:
  ```json
  {
    "data": {
      "insights": {
        "roleSummary": "...",
        "senioritySignals": ["Leads squads"],
        "requiredTechnologies": [{ "name": "React", "importance": "core" }],
        "culturalNotes": ["Bias toward async communication"],
        "responsibilityThemes": ["Mentor engineers"],
        "riskAlerts": ["Heavy on-call expectation"]
      },
      "matches": {
        "projects": [
          { "id": "project-uuid", "name": "GraphQL API", "summary": "...", "matchingTechnologies": ["React", "GraphQL"] }
        ],
        "resumes": [
          { "id": "resume-uuid", "sourceName": "Resume 2024", "matchingSkills": ["React", "TypeScript"], "summary": "..." }
        ],
        "coverage": {
          "covered": ["react", "graphql"],
          "missing": ["apollo", "rust"]
        }
      }
    }
  }
  ```
- UI ideas: show “JD Insights” cards, highlight missing skills, offer CTA buttons (tailor resume, start persona session, reindex project).

## Auth & Settings

- **POST** `/auth/register` / **POST** `/auth/login` → `{ token, user }`
- **GET** `/auth/me` / **PUT** `/auth/me` *(auth required)* for profile updates
- **GET/PUT** `/settings` *(auth)* to manage default provider + notification prefs
- **GET** `/settings/provider-keys`, **PUT** `/settings/provider-keys`, **DELETE** `/settings/provider-keys/:provider` *(auth)* to manage encrypted provider keys

## Developer Profile

- **POST** `/profiles/developer-report` *(auth required)* to summarize the current user's resume highlights, persona insights, and indexed project evidence.
  ```json
  {
    "llmProvider": "openrouter"
  }
  ```
- Response:
  ```json
  {
    "data": {
      "developerOverview": "Full-stack engineer with strong TypeScript and cloud delivery experience...",
      "coreStrengths": ["Turns ambiguous product needs into shipped systems"],
      "growthOpportunities": ["Add fresher Kubernetes operations evidence"],
      "projectEvidence": ["Project Atlas: Next.js analytics workspace..."],
      "technicalDepth": ["Distributed systems", "LLM integrations"],
      "riskCaveats": ["Limited mobile-platform evidence"],
      "confidence": "medium"
    }
  }
  ```

## LLM Catalog Routes

- **GET** `/llm/models`
- **GET** `/llm/models/:provider`
- **GET** `/llm/ollama/tags`

## Implementation Tips

1. **API client**: centralize fetch logic to unwrap `{ data }`, capture `{ error }`, and attach base headers.
2. **LLM selections**: pair `/llm/models` with forms to let users override providers/models.
3. **Graph tooling**: memoize `/knowledge-graph`, provide filters/search, and surface summary stats.
4. **Job intelligence UI**: combine insights + coverage data into comparison tables with remediation CTAs.
5. **Optimistic UX**: indexing/tailoring/job intelligence can take seconds; show progress indicators.
6. **Error handling**: parse `error.details` (zod issues) for inline validation messaging.
7. **State caching**: persist IDs plus JWT token securely (httpOnly cookies or encrypted storage).

## Recent Additions

- `GET /llm/ollama/tags` – cached Ollama Cloud model tags (5-minute TTL).
- `GET /llm/models`, `GET /llm/models/:provider` – multi-provider model catalogs.
- `GET /knowledge-graph` – consolidated project/resume/technology/artifact/persona graph.
- `POST /intelligence/job` – job description insights plus project/resume coverage analysis.
- `POST /profiles/developer-report` – source-backed developer baseline report for the authenticated user.
