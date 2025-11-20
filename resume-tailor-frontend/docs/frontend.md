# Frontend Integration Notes

Use this document as the source of truth for building React clients against the Experience API. All responses follow `{ "data": T }` on success or `{ "error": { "message": string, "details"?: unknown } }` on failure. Send and accept JSON (`Content-Type: application/json`).

- **Base URL**: `http://localhost:4000` (configurable)
- **LLM Providers**: `ollama | bedrock | google | openrouter` (optional per request; backend defaults to `DEFAULT_LLM_PROVIDER`)
- **Auth**: JWT bearer token (register/login before calling protected routes)

## Shared Patterns

- Validate request bodies client-side; backend uses `zod` and returns 400 with issue details.
- Query params (`search`, `technology`, `userId`, etc.) are optional; omit keys when not used.
- All identifiers are UUID strings; persist them in client state/routing.

## Health

| Route     | Method | Description             | Response                                                       |
| --------- | ------ | ----------------------- | -------------------------------------------------------------- |
| `/health` | GET    | Verify API availability | `{ "data": { "status": "ok", "environment": "development" } }` |

## Projects Module

- **POST** `/projects/index` _(auth required)_

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

- **GET** `/projects?search=api&technology=TypeScript&mine=true` (set `mine=true` to restrict to current user)

- **GET** `/projects/:projectId` _(auth required)_

## Resumes Module

- **POST** `/resumes/ingest` _(auth required)_
  ```json
  {
    "userId": "user-123",
    "resumeText": "Plaintext or OCR output...",
    "sourceName": "May 2024 resume.pdf",
    "llmProvider": "google"
  }
  ```
- Response: `{ record: Resume, insight: ResumeInsight }`

- **GET** `/resumes` _(current user)_
- **GET** `/resumes/:resumeId`

## Conversations (persona coaching)

- **POST** `/conversations/session` _(auth required)_ to start.
- **POST** `/conversations/session/:sessionId/respond` _(auth required)_:
  ```json
  {
    "userAnswer": "Detailed reasoning",
    "thoughtProcess": "Optional reflection",
    "llmProvider": "openrouter"
  }
  ```
- **GET** `/conversations/session/:sessionId` _(auth required)_

## Retrieval (tailored assets)

- **POST** `/retrieval/tailor` _(auth required)_ to generate resume/cover-letter-style content with structured recommendations.
  ```json
  {
    "userId": "user-123",
    "jobTitle": "Senior React Engineer",
    "jobDescription": "Full JD text...",
    "resumeId": "uuid-from-resume",
    "projectIds": ["project-uuid-1", "project-uuid-2"],
    "assetType": "cover_letter",
    "llmProvider": "ollama"
  }
  ```
- **GET** `/retrieval/tailored` _(auth required)_ to list previous assets.

## Knowledge Graph API

Visualize the relationship between projects, resumes, technologies, artifacts, and persona focus areas.

- **GET** `/knowledge-graph?userId=user-123` _(defaults to current user if omitted)_
- Response:
  ```json
  {
    "data": {
      "nodes": [
        {
          "id": "project:123",
          "type": "project",
          "label": "Repo Name",
          "metadata": { "summary": "...", "technologies": ["React"] }
        },
        {
          "id": "technology:abc",
          "type": "technology",
          "label": "React",
          "metadata": { "category": "frontend" }
        },
        {
          "id": "artifact:xyz",
          "type": "artifact",
          "label": "heuristic",
          "metadata": { "path": "src/App.tsx" }
        },
        { "id": "persona:789", "type": "persona", "label": "backend-node" }
      ],
      "edges": [
        {
          "id": "edge:tech-project:abc:123",
          "source": "technology:abc",
          "target": "project:123",
          "type": "technology_to_project"
        },
        {
          "id": "edge:project-artifact:123:xyz",
          "source": "project:123",
          "target": "artifact:xyz",
          "type": "project_to_artifact"
        },
        {
          "id": "edge:persona-tech:789:abc",
          "source": "persona:789",
          "target": "technology:abc",
          "type": "persona_focus"
        }
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

- **POST** `/intelligence/job` _(auth required)_
  ```json
  {
    "jobDescription": "Full job description text...",
    "userId": "user-123",
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
          {
            "id": "project-uuid",
            "name": "GraphQL API",
            "summary": "...",
            "matchingTechnologies": ["React", "GraphQL"]
          }
        ],
        "resumes": [
          {
            "id": "resume-uuid",
            "sourceName": "Resume 2024",
            "matchingSkills": ["React", "TypeScript"],
            "summary": "..."
          }
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

## LLM Catalog Routes

## Auth & Settings

- **POST** `/auth/register` / **POST** `/auth/login` → `{ token, user }`
- **GET** `/auth/me` / **PUT** `/auth/me` _(auth required)_ for profile updates
- **GET/PUT** `/settings` _(auth)_ to manage default provider + notification prefs
- **GET** `/settings/provider-keys`, **PUT** `/settings/provider-keys`, **DELETE** `/settings/provider-keys/:provider` _(auth)_ to manage encrypted provider keys

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
