# Frontend app workflows

How the Next.js workspace calls the API for resume, cover-letter, and coaching flows. Page map and setup live in `README.md`; payload shapes live in `frontend.md`.

## Pages

| Route | Auth | What it composes |
| --- | --- | --- |
| `/` | `AuthWall` around the dashboard | Project indexer/list, resume insights, persona coach, tailored-asset card, knowledge graph, LLM catalog, developer report |
| `/resume` | `AuthWall` | Ingest form + builder for **the first listed resume only** (`listResumes()[0]`) |
| `/cover-letter` | `AuthWall` | Cover-letter workbench + job-intelligence workbench; intel matches seed the letter form |
| `/settings` | Hidden in nav until signed in | Defaults and encrypted provider-key CRUD |

Nav is `src/components/layout/app-shell.tsx`.

## Cover letter studio

`src/app/cover-letter/page.tsx` wires two panels:

1. `JobIntelWorkbench` posts `POST /intelligence/job` with `{ jobDescription, llmProvider? }`. The UI job-title field is **local only** — it is not sent to the API.
2. On success it copies `jobTitle`, `jobDescription`, the first matched resume id, and matched project ids into `CoverLetterWorkbench`.
3. The workbench posts `POST /retrieval/tailor` with `assetType: "cover_letter"` and exports client-side PDF/DOCX via `src/lib/exporters.ts`.

Client vs API floors:

| Surface | `jobDescription` minimum |
| --- | --- |
| Cover-letter form (`zod`) | 100 characters |
| Job-intel form | Non-empty (no min); API requires **50** |
| `POST /retrieval/tailor` | **30** |

If you omit `projectIds`, the API fills context from the three newest projects **in the whole database**, not the signed-in user. The studio avoids that when job intel returned project matches.

Export is browser-only (`jspdf` / `docx`). Nothing is stored as a file on the API; the tailored asset JSON is already saved by `/retrieval/tailor`.

## Resume studio

`ResumeIngestForm` accepts `.txt,.pdf` but reads files with `file.text()`. That is fine for `.txt`. A PDF is not parsed — the textarea usually gets binary garbage and client validation (`resumeText` min **200**) fails or the API extracts nonsense. Paste plaintext (or OCR) instead.

The builder (`ResumeBuilder` + `useResumeDraft`) keeps a local draft. Generate/improve call `/resumes/:id/sections/:section/{generate,improve}`; Apply PATCHes the section. Custom draft sections and PDF/DOCX export do not persist unless you Apply.

The studio does not paginate resumes: it always edits `data[0]`.

## Persona coach

`ConversationCoach` sends `personaTopic` from `PERSONA_TOPICS` in `src/lib/constants.ts`:

- `frontend-react`, `backend-node` — match API presets
- `platform-aws`, `ai-ml` — **no API preset**; the backend treats them as generic topics

Focus areas are a comma-separated string split on the client. Empty tokens are dropped.

## Client API behavior

- `apiRequest` unwraps `{ data }`, throws `error.message`, and maps HTTP 401 to `Unauthorized` (auth context then clears `experience:auth-token` / `experience:auth-user`).
- React Query defaults (via `app-providers`): 60s stale time, no refetch on window focus, one retry.
- Per-request `llmProvider` is the only UI control that changes which adapter the API constructs. Saving keys under Settings does not change runtime credentials.
