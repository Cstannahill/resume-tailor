# User Context Pipeline

The user context pipeline builds a compact snapshot of what Resume Tailor knows about a user. LLM workflows use it so the UI can send only the current task while the API adds resume, project, and coaching evidence from stored data.

Source of truth: `src/modules/profile/userContext.service.ts`.

## Data Flow

```text
Resumes             Projects             Insights
  |                    |                    |
  +--------------------+--------------------+
                       |
              collectUserContext(userId)
                       |
          UserContextSnapshot + composed notes
                       |
      Developer report and resume-section prompts
```

## What Gets Collected

`collectUserContext(userId, options)` returns:

| Field | Source | Rule |
| --- | --- | --- |
| `resumeSummary` | `Resume.extractedSummary` | Uses `options.resume` when provided; otherwise the user's newest resume (`createdAt` desc). |
| `resumeSkills` | `Resume.skills` | All stored skills from that resume. Composed notes include the first 20. |
| `resumeExperienceHighlights` | `Resume.experience` | Up to 3 experience entries. Each includes role, company, and up to 2 achievements. |
| `projectHighlights` | `Project` rows | Owner is `resume.userId` when a resume is supplied, otherwise the requested `userId`. Ordered by `updatedAt` desc, default cap 3. Each line includes name, summary/description, up to 6 technologies, and up to 2 highlights. |
| `personaInsights` | `Insight` rows | `source` contains `conversation` (case-insensitive), newest first, default cap 4. |
| `additionalInsights` | `Insight` rows | Non-conversation insights, newest first, default cap 4. |

Insight text prefers `Insight.notes`, then payload `summary` / `evaluation` / `notes` / `description`, then a serialized payload truncated at 280 characters.

`composeUserContextNotes(snapshot)` turns the snapshot into labeled prompt sections. Empty snapshots yield `undefined`.

## Consumers

### Developer Baseline Report

`POST /profiles/developer-report` is authenticated. The controller sets `userId` from `req.user.id`.

```http
POST /profiles/developer-report
Authorization: Bearer <token>
Content-Type: application/json

{
  "llmProvider": "openrouter"
}
```

The service calls `collectUserContext(req.user.id)`, builds `createDeveloperProfilePrompt`, and requires structured JSON:

- `developerOverview`
- `coreStrengths`
- `growthOpportunities`
- `projectEvidence`
- `technicalDepth`
- `riskCaveats`
- `confidence` (`low`, `medium`, or `high`)

If the LLM response cannot be parsed, the request fails with `LLM returned unstructured developer profile.`

### Resume Section Generation And Improvement

`POST /resumes/:resumeId/sections/:section/generate` and `.../improve` use the same pipeline.

`buildSectionContext()` in `resume.service.ts`:

1. Verifies the authenticated user owns the resume (`404` / `403` otherwise).
2. Fills missing summary, skills, job title, company, achievements, and notes from the stored resume / selected experience index.
3. Calls `collectUserContext(resume.userId, { resume })`.
4. Fills missing resume/project/persona/additional insight arrays from the snapshot.
5. Appends composed notes to any user-provided `context.notes`.

UI callers should send only task-specific deltas (target job title, company, `experienceIndex`, rewrite instructions). Existing client values are not overwritten.

## Operational Notes

- Reports are sparse until the user has ingested a resume, indexed **owned** projects, and completed persona-coach sessions.
- Public/unowned projects are not included in this snapshot (`listProjects({ ownerId })`).
- Persona insights appear only when saved insight `source` contains `conversation`.
- Resume ingestion creates non-conversation insights, which land in `additionalInsights`.
- Limits are intentional to keep prompts small. Raise them only after considering token cost.

## Related Codepaths

- `src/modules/profile/userContext.service.ts` — aggregation and composed notes
- `src/modules/profile/profile.service.ts` — developer report generation
- `src/modules/profile/profile.controller.ts` — JWT user wiring
- `src/modules/resumes/resume.service.ts` — `buildSectionContext`
- `src/repositories/resumes/resume.repository.ts` — newest-resume selection
- `src/repositories/projects/project.repository.ts` — owner scoping and `updatedAt` order
- `src/repositories/insights/insight.repository.ts` — insight listing
