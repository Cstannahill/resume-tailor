# Frontend Integration Notes

Use this document as the source of truth for building React clients against the Experience API. All responses follow `{ "data": T }` on success or `{ "error": { "message": string, "details"?: unknown } }` on failure. Send and accept JSON (`Content-Type: application/json`). Request bodies are capped at **2mb**.

- **Base URL**: `http://localhost:4000` (configurable via `PORT` / `NEXT_PUBLIC_API_BASE_URL`)
- **LLM Providers**: `ollama | bedrock | google | openrouter` (optional per request; backend defaults to `DEFAULT_LLM_PROVIDER`)
- **Auth**: JWT bearer token (register/login before calling protected routes)

## Shared Patterns

- Validate request bodies client-side; backend uses `zod` and returns 400 with issue details.
- Query params (`search`, `technology`, `ownerId`, `mine`, `userId` on knowledge graph) are optional; omit keys when unused.
- Protected write routes derive the user from the bearer token. Do **not** send `userId` in resume ingest, retrieval, job intelligence, conversations, or profile-report bodies.
- All identifiers are UUID strings; persist them in client state/routing.

## Health

| Route | Method | Auth | Response |
| --- | --- | --- | --- |
| `/health` | GET | Public | `{ "data": { "status": "ok", "environment": "development" } }` |

## Auth & Settings

- **POST** `/auth/register` — `{ email, password, displayName? }`. Password min length is 8. Returns `{ token, user }`.
- **POST** `/auth/login` — `{ email, password }`. Returns `{ token, user }`.
- **GET** `/auth/me` / **PUT** `/auth/me` *(auth)* — profile fetch; update body is `{ displayName? }`.
- **GET/PUT** `/settings` *(auth)* — `{ defaultLlmProvider?, notificationPrefs? }`. The stored default is **not** currently consumed by `getLLMAdapter()`.
- **GET/PUT/DELETE** `/settings/provider-keys` *(auth)* — encrypted key storage. List responses include `configured: true` and never the secret. **Adapters still read process env vars**, not these stored keys.

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
  - Local indexing uses `{ "kind": "local", "path": "/absolute/or/windows/path" }`.
  - Response includes `{ project, heuristics, summary }`. Owner is set from the JWT.

- **GET** `/projects?search=api&technology=TypeScript&mine=true` — public. `mine=true` requires a valid token and filters to the current user. `ownerId` is an explicit owner filter.

- **GET** `/projects/:projectId` — public for ownerless projects; returns `403` when `ownerId` is set and does not match the bearer token.

## Resumes Module

- **POST** `/resumes/ingest` *(auth required)*
  ```json
  {
    "resumeText": "Plaintext or OCR output...",
    "sourceName": "May 2024 resume.pdf",
    "llmProvider": "google"
  }
  ```
  - `resumeText` must be at least 50 characters.
  - Response: `{ record: Resume, insight: ResumeInsight }`

- **GET** `/resumes` *(current user only)*
- **GET** `/resumes/:resumeId` *(owner only; 403/404 otherwise)*
- Resume-section generate/improve/patch routes live in `frontendv2.md`.

## Conversations (persona coaching)

All conversation routes require auth. Session `userId` is taken from the JWT. Fetching another user's session returns `403`.

- **POST** `/conversations/session`
  ```json
  {
    "personaTopic": "frontend-react",
    "focusAreas": ["hooks", "performance"],
    "llmProvider": "ollama"
  }
  ```
- **POST** `/conversations/session/:sessionId/respond`
  ```json
  {
    "userAnswer": "Detailed reasoning",
    "thoughtProcess": "Optional reflection",
    "llmProvider": "openrouter"
  }
  ```
- **GET** `/conversations/session/:sessionId`

## Retrieval (tailored assets)

- **POST** `/retrieval/tailor` *(auth required)*
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
  - `jobDescription` min length is 30. `assetType` is `resume | cover_letter | summary`.
- **GET** `/retrieval/tailored` *(auth required)* lists assets for the current user.

## Knowledge Graph API

- **GET** `/knowledge-graph` or `/knowledge-graph?userId=<uuid>` *(public)*
- `userId` filters **resume** and **conversation-session** nodes. Project nodes are always unscoped. Omitting `userId` does **not** fall back to the JWT user.
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
        { "id": "edge:tech-project:abc:123", "source": "technology:abc", "target": "project:123", "type": "technology_to_project" }
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

## Job Intelligence

- **POST** `/intelligence/job` *(auth required)*
  ```json
  {
    "jobDescription": "Full job description text...",
    "llmProvider": "google"
  }
  ```
- Response includes `insights` (role summary, seniority, required tech, cultural notes, risks) plus `matches` against the caller's projects/resumes and a `coverage` object (`covered` / `missing`).

## Profiles

- **POST** `/profiles/developer-report` *(auth required)*
  ```json
  {
    "llmProvider": "openrouter"
  }
  ```
- Response:
  ```json
  {
    "data": {
      "developerOverview": "...",
      "coreStrengths": ["Owns complex migrations"],
      "growthOpportunities": ["Needs fresher mobile exposure"],
      "projectEvidence": ["Project Flow: GraphQL/Next.js platform ..."],
      "technicalDepth": ["Distributed systems"],
      "riskCaveats": ["Limited Kubernetes ops history"],
      "confidence": "medium"
    }
  }
  ```
- Unparseable LLM JSON fails the request (`LLM returned unstructured developer profile.`). See `user-context.md` for the snapshot this route uses.

## LLM Catalog Routes

Public. Catalogs cache in process memory.

- **GET** `/llm/models` / **GET** `/llm/models/:provider` — provider catalogs; 10-minute TTL.
- **GET** `/llm/ollama/tags` — Ollama Cloud tags; 5-minute TTL; requires `OLLAMA_API_KEY` on the server.

## Implementation Tips

1. Centralize fetch logic to unwrap `{ data }`, capture `{ error }`, and attach the bearer token.
2. Pair `/llm/models` with forms so users can override `llmProvider` per request.
3. Memoize `/knowledge-graph` and always pass `userId` when you want resume/persona scoping.
4. Indexing, tailoring, job intelligence, and developer reports can take several seconds.
5. Parse `error.details` (zod issues) for inline validation messaging.
6. The current frontend stores the JWT in `localStorage` (`experience:auth-token`); treat that as a known constraint, not a recommendation for production.

## Related Docs

- `frontendv2.md` — resume-section generate/improve/patch and context enrichment.
- `user-context.md` — snapshot fields, limits, and consumers.
- `cover-letter.md` — shared JSON prompt/parsing behavior.
