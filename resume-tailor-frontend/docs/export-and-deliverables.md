# Client-side PDF / DOCX export

There is no export API. The studio builds files in the browser with `jspdf` and `docx`, then triggers a download.

Sources: `src/lib/exporters.ts`, `src/lib/utils.ts` (`downloadBlob`), `src/components/modules/resume/resume-builder.tsx`, `src/components/modules/retrieval/cover-letter-workbench.tsx`.

## Shared helper

```ts
exportToPdf(payload, filename)
exportToDocx(payload, filename)
```

`ExportPayload` is `{ title, sections: [{ heading, lines }] }`. Empty `lines` arrays are skipped.

| Format | Library (dynamic import) | Font | Page |
| --- | --- | --- | --- |
| PDF | `jspdf` | Helvetica | A4, 54pt margin, 14pt leading |
| DOCX | `docx` `Packer.toBlob` | Calibri | 720 twips (~0.5in) margins |

Both no-op when `typeof window === "undefined"`. PDF uses `doc.save()`. DOCX uses `downloadBlob` (object URL + `<a download>`). The `file-saver` dependency is unused.

Helvetia/Calibri only: non-Latin glyphs may missing-box in PDF.

## Resume builder

`sectionsForExport` is Summary, Skills (comma chunks of 6), Experience (`role / company` + achievements), Education (`degree / institution`), then custom sections.

**Not written into the file body:**

- Contact email, phone, location, website, LinkedIn
- Headline (used only as the document **title**)
- Contact name (used only as the **filename**, default `resume.pdf` / `resume.docx`)
- Experience/education dates (the editor does not collect them)

The Preview tab shows name, headline, and `email • location • phone`. PDF/DOCX will not match that preview.

The editor has no phone/website/LinkedIn fields. Ingest regex may still store `contact.phone` on the Prisma row; Preview can show it if the draft ever hydrates from `insight.contact`.

## Cover letter studio

Exports the edited textarea (split on blank lines) plus optional Project Highlights, Resume Bullets, and Alignment Notes from tailor recommendations.

Filenames are hardcoded: `cover-letter.pdf` / `cover-letter.docx`. The PDF title is `{jobTitle or "Cover Letter"} - {llmProvider or "auto"}`.

Edits in the textarea are included. Changing recommendation chips after generate does not rewrite `result` unless the user edits the textarea.

Buttons stay disabled until `result` is non-empty.

## Resume draft vs export quality

`useResumeDraft(insight)` initializes React state **once**. After ingest:

1. `ResumeIngestForm` success **discards** the POST `{ record, insight }` payload.
2. It only `invalidateQueries(["resumes"])`.
3. `GET /resumes` returns Prisma columns (`extractedSummary`, `skills`, `experience`, `contact`) — not the `insight` object the builder reads.
4. `ResumeBuilder` stays mounted (`!query.isLoading && <ResumeBuilder resume={resume} />`), so the draft does not reset.

Export therefore often contains `DEFAULT_RESUME_TEMPLATE` (see `src/lib/constants.ts`) until a full remount, even when ingestion succeeded. Manual editor changes are local-only until the user hits Apply on an AI suggestion (PATCH). Custom sections and education never PATCH.

## Related codepaths

- `src/hooks/useResumeDraft.ts`
- `src/app/resume/page.tsx`
- `src/components/modules/resume/resume-ingest-form.tsx`
- `src/services/resumes.ts`
