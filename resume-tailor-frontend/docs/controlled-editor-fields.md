# Resume editor round-trip

The resume designer stores skills and achievement lines by splitting the field, then displays `array.join(...)`. Characters that the splitter drops never remain on screen. PDF and DOCX then interpolate missing role and school fields differently from the Preview tab.

Sources: `src/components/modules/resume/resume-builder.tsx`, `src/hooks/useResumeDraft.ts`, `src/lib/constants.ts`, `src/lib/exporters.ts`.

## Skills field eats a trailing comma

The input is `value={draft.skills.join(", ")}`. Each change runs:

```ts
value.split(",").map((skill) => skill.trim()).filter(Boolean)
```

| Typed value | Stored skills | Shown again |
| --- | --- | --- |
| `TypeScript, React` | `TypeScript`, `React` | `TypeScript, React` |
| `TypeScript, React,` | `TypeScript`, `React` | `TypeScript, React` |
| `TypeScript, React ` | `TypeScript`, `React` | `TypeScript, React` |
| `TypeScript, React, Node` in one change (paste) | three skills | `TypeScript, React, Node` |

A trailing comma or space is removed before the next keystroke. Typing `, Node` at the end glues `Node` onto the last skill (`ReactNode`). A paste that already contains a comma and text on both sides adds the new skill in that single change.

The fresh draft seeds skills from `DEFAULT_RESUME_TEMPLATE` (`TypeScript`, `React`, `Node.js`, `PostgreSQL`, `AWS`, `CI/CD`, `LangChain`). Those tokens can be edited in place. Appending another token has the same trailing-comma behavior.

AI Apply writes the suggestion array directly and does not go through this splitter.

## Achievement lines eat a trailing newline

After **Add role**, achievements start as `["Impact bullet"]`. The textarea is `value={exp.achievements.join("\n")}` and stores `value.split("\n").filter(Boolean)`.

| Typed value | Stored lines |
| --- | --- |
| `Impact bullet` | `Impact bullet` |
| `Impact bullet\n` (Enter) | `Impact bullet` |
| `Impact bullet\nShipped the API` in one change (paste) | two lines |
| `Impact bullet\n ` | `Impact bullet` and a line that is a single space |

Empty lines are dropped, so Enter does not leave a new row for the next character. The next letter appends to the current line. Unlike skills, achievement lines are not trimmed, so a whitespace-only line is kept.

`handleExperienceChange` copies the experiences array and then mutates the existing object (`experiences[index]`). Company, role, and achievements on that object change in place before `updateDraft`.

## Preview text versus the file

Preview renders `{exp.role} / {exp.company}` and `{edu.degree} / {edu.institution}` as React children. A missing value is an empty child.

`sectionsForExport` builds strings:

| Line | Expression | Missing value |
| --- | --- | --- |
| Experience heading | `` `${exp.role} / ${exp.company}` `` | the word `undefined` |
| Education | `` `${edu.degree ?? ""} / ${edu.institution}` `` | degree becomes `""`; a missing `institution` is the word `undefined` |
| Skills | groups of 6 joined with `, ` | Preview joins the same skills with ` • ` |

**Add role** stores `company: ""` and `role: ""`, so the file line is ` / ` plus `Impact bullet`, not the word `undefined`. **Add school** stores `institution: ""` and `degree: ""`, so the file line is ` / `. The word `undefined` appears when the property is missing, which is what `useResumeDraft` keeps if an `insight.experiences` or `insight.education` entry omits it.

The initial headline is `insight?.contact?.name ?? "Software Engineer"`. With no insight, the PDF title is `Software Engineer` until the headline input changes. The filename still uses `draft.contact.name`, or `resume` when that is missing.

Export skips a section only when `lines` is empty. A custom section body of blank lines is `split("\n")`, which keeps the empty strings, so those lines are still passed to jsPDF and docx.
