# Signals the studio drops

The API returns fields the workspace never renders, and a few editor actions send a different body than the on-screen copy implies.

Sources: `src/components/modules/intelligence/job-intel-workbench.tsx`, `src/app/cover-letter/page.tsx`, `src/components/modules/resume/resume-builder.tsx`, `src/components/modules/resume/resume-ingest-form.tsx`, `src/components/modules/conversations/conversation-coach.tsx`, `src/components/llm-provider-select.tsx`, `src/types/job-intelligence.ts`.

## Job intelligence panel

`JobIntelWorkbench` renders `roleSummary`, `senioritySignals`, each `requiredTechnologies` name, `matches.projects` (name + matching technology names), `matches.resumes` (source name + matching skills), and coverage `covered` / `missing`.

These response fields are typed and returned, and the panel does not render them:

| Field | Notes |
| --- | --- |
| `culturalNotes` | Dropped |
| `responsibilityThemes` | Dropped |
| `riskAlerts` | Dropped |
| `matches.projects[].summary` | Dropped. The card description says analysis auto-links indexed work; the row is only the project name and matched technology strings. |
| `matches.resumes[].summary` | Dropped |

`importance` is shown as uppercase text next to the name. It does not change which rows are listed. The studio type allows `"core" \| "supplemental"`. The API prompt asks for `"core" \| "nice_to_have"`, so a faithful model prints `NICE_TO_HAVE`, not `SUPPLEMENTAL`.

`/cover-letter` mounts `CoverLetterWorkbench` **above** `JobIntelWorkbench`. A successful analysis `setValue`s the form that is already off the top of the viewport. The page does not scroll. An empty job-title input is not copied (`if (intelContext.jobTitle)`), so a title already typed into the letter form is left as-is.

## Resume improve uses the draft, not only the row

Generate / improve context from the builder is `{ notes }` plus `experienceIndex` for a role. Summary generate is the only call that also sends `tone: "concise"`.

Improve `currentContent` is the **draft**:

| Section | `currentContent` | Apply writes |
| --- | --- | --- |
| `summary` | `[draft.summary]` | `suggestion.content.join(" ")` — bullets become one paragraph in `extractedSummary` |
| `skills` | `draft.skills` | that string array |
| `experiences` | that role's `achievements` only | the whole local experiences array, with that role's achievements replaced |

The skills field splits on commas only (`value.split(",")`). A model line such as `Objective-C` stays one skill; `full-stack` stays one skill. Hyphen splitting in the API seed (see the API doc below) does not apply to this editor.

The API still fills summary and skills into the prompt from the resume row when the client omits them, and it appends composed user-context notes. Improve therefore shows the model both the stored resume and the draft. If the draft is still `DEFAULT_RESUME_TEMPLATE`, Apply persists a rewrite of the template.

Generate and improve do not send `llmProvider`.

## Ingest source label

`ResumeIngestForm` sends `sourceName: values.sourceName ?? fileName`. An empty string does not fall through to the uploaded file name. Leaving the source input blank after typing in it stores `""` instead of `May-2024.pdf`.

The file input `accept` is `.txt,.pdf`. The reader is `file.text()` either way.

## Persona coach

The coach renders `currentQuestion.text`, optional `difficulty`, `userAnswer`, and `evaluation` (a string). The toast description is `evaluation.evaluation` only.

Not shown, even when the API JSON includes them:

- question `rubric`
- `proficiencyLevel`
- `followUpPlan`
- `evaluation.insights`
- `technologySignals`

`getConversation` is never called, so a refresh drops difficulty along with the session.

## Provider select sticks

`LlmProviderSelect` has no empty option. `optional` only adds the word "optional" to the label. After a choice, `onValueChange` always emits a provider and the control cannot return to "omit `llmProvider` and use `DEFAULT_LLM_PROVIDER`". Ingest, job intelligence, cover letter, and the developer report all use this select.

## Related codepaths

- `src/app/cover-letter/page.tsx` (`handleIntelComplete`)
- `src/components/modules/retrieval/cover-letter-workbench.tsx` (the `useEffect` that `setValue`s intel into the form)
- `src/hooks/useResumeDraft.ts`
- `src/services/{intelligence,resumes,conversations}.ts`
- `../resume-tailor-api/docs/parsed-json-and-seed-heuristics.md`
