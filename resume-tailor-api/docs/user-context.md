# User Context Pipeline

The user context pipeline builds a compact snapshot of what Resume Tailor knows about the authenticated user. LLM workflows use this snapshot so the UI can send only the user's immediate intent while the API adds resume, project, and coaching evidence from stored data.

Source of truth: `src/modules/profile/userContext.service.ts`.

## Data Flow

```text
Resumes             Projects             Insights
  |                    |                    |
  |                    |                    |
  +--------------------+--------------------+
                       |
              collectUserContext(userId)
                       |
          UserContextSnapshot + composed notes
                       |
      Developer report and resume section prompts
```

## What Gets Collected

`collectUserContext(userId, options)` returns:

| Field | Source | Rule |
| --- | --- | --- |
| `resumeSummary` | `Resume.extractedSummary` | Uses the supplied resume when provided; otherwise the newest resume for the user. |
| `resumeSkills` | `Resume.skills` | Uses all stored skills from the selected resume. Prompt notes include the first 20. |
| `resumeExperienceHighlights` | `Resume.experience` | Converts up to 3 experience entries into role/company/highlight strings. Each entry includes up to 2 achievements. |
| `projectHighlights` | `Project` rows | Uses the selected resume's `userId` when a resume is supplied; otherwise the requested `userId`. Projects are ordered by `updatedAt desc` and capped at 3 by default. |
| `personaInsights` | `Insight` rows | Uses insights whose `source` contains `conversation` (case-insensitive), ordered newest first, capped at 4 by default. |
| `additionalInsights` | `Insight` rows | Uses all non-conversation insights, ordered newest first, capped at 4 by default. |

Project highlights include project name, summary or description, up to 6 technologies, and up to 2 stored highlights. Insight text prefers `Insight.notes`, then selected payload fields (`summary`, `evaluation`, `notes`, `description`), then a short serialized payload fallback.

## Consumers

### Developer Baseline Report

`POST /profiles/developer-report` is an authenticated route. The controller derives `userId` from `req.user.id`; clients should not send a user id.

```http
POST /profiles/developer-report
Authorization: Bearer <token>
Content-Type: application/json

{
  "llmProvider": "openrouter"
}
```

The service calls `collectUserContext(req.user.id)`, passes the snapshot to `createDeveloperProfilePrompt`, and expects structured JSON with:

- `developerOverview`
- `coreStrengths`
- `growthOpportunities`
- `projectEvidence`
- `technicalDepth`
- `riskCaveats`
- `confidence` (`low`, `medium`, or `high`)

If the LLM response cannot be parsed as the expected JSON shape, the request fails with `LLM returned unstructured developer profile.`

### Resume Section Generation And Improvement

`POST /resumes/:resumeId/sections/:section/generate` and `POST /resumes/:resumeId/sections/:section/improve` also use the same pipeline.

Before prompting the LLM, `buildSectionContext()`:

1. Verifies that the authenticated user owns the resume.
2. Merges missing summary, skills, job title, company, achievements, and notes from the stored resume.
3. Calls `collectUserContext(resume.userId, { resume })`.
4. Adds missing resume highlights, project highlights, persona insights, and additional insights.
5. Appends composed context notes to any user-provided `context.notes`.

This means UI callers should send only the current task-specific deltas, such as a target job title, company, explicit notes, selected `experienceIndex`, or rewrite instructions. The backend will add the broader stored evidence.

## Operational Notes

- Reports can be sparse when the user has not ingested a resume, indexed projects, or completed persona-coach conversations.
- Indexing owned projects improves `projectHighlights`; unowned/public projects are not included in this snapshot.
- Persona-coach sessions improve `personaInsights` only when saved insights use a `source` containing `conversation`.
- Resume ingestion creates non-conversation insights, so those appear under `additionalInsights`.
- The snapshot is intentionally small. Increase limits only when prompt size and model cost have been considered.

## Related Codepaths

- `src/modules/profile/userContext.service.ts` - aggregation and composed notes
- `src/modules/profile/profile.service.ts` - developer report generation
- `src/modules/resumes/resume.service.ts` - resume-section context enrichment
- `src/repositories/resumes/resume.repository.ts` - newest resume selection
- `src/repositories/projects/project.repository.ts` - project ordering and owner scoping
- `src/repositories/insights/insight.repository.ts` - insight ordering
