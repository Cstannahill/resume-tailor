# Indexing signals the matcher actually sees

`analyzeSourceFiles` builds the `technologies` array that job intelligence and `GET /projects?technology=` compare. The strings are display names from the file extension, not package names from `package.json`.

## Language vocabulary

| Extension | `technologies` entry |
| --- | --- |
| `.ts`, `.tsx` | `TypeScript` |
| `.js`, `.jsx` | `JavaScript` |
| `.py` | `Python` |
| `.rb` | `Ruby` |
| `.go` | `Go` |
| `.java` | `Java` |
| `.cs` | `C#` |
| `.php` | `PHP` |
| `.rs` | `Rust` |
| `.kt` | `Kotlin` |
| `.swift` | `Swift` |
| `.scala` | `Scala` |
| `.cpp` | `C++` |
| `.c` | `C` |
| `.h` | `C/C++` |

Anything else, including `package.json`, `requirements.txt`, and `pyproject.toml`, is labeled `Unknown` and **removed** from `technologies`. Those files still count toward the 250-file slice and toward `keyMetrics.totalLinesOfCode`.

`C`, `C++`, and `C/C++` are three different strings. `GET /projects?technology=C++` uses Prisma `has`, which is case-sensitive, so it does not match a repo whose only C-family files were headers (`C/C++`). Job intelligence's `hasSome` filter uses the raw LLM technology names before the later lowercase overlap check, so a JD technology of `typescript` does not select projects tagged `TypeScript`.

Included globs are source extensions above plus the three manifests. Ignored globs are `node_modules`, `dist`, `build`, `.git`, `*.lock`, and `*.min.*`. Directories such as `.next`, `venv`, and `target` are not ignored.

## What counts as an export

`extractExports` keeps names from this pattern only:

```text
export const|class|function|interface|type <Name>
```

These are not counted:

- `export async function foo` (`async` sits where the pattern expects `function`)
- `export default`, `export { foo }`, `module.exports`
- Python, Go, Java, and other non-JS declarations

`keyFunctionality` is at most **20** lines of the form `relative/path: NameA, NameB`, in glob order. The third highlight is `Detected <N> exported components`, where `N` is that capped list length (files that had a match), not the number of exported symbols, and not a component count.

The other two highlights are always present:

- `Analyzed <fileInsights.length> key source files`
- `Primary languages: <technologies joined by comma, or Unknown>`

`linesOfCode` is `content.split(/\r?\n/).length`. An empty file counts as **1**. The whole file is read as UTF-8 with no size cap.

## What a re-index rewrites

`indexProject` does not wrap the writes in a transaction:

1. `upsertProject` updates the existing row when `repoUrl` or `localPath` matches, and sets `summary` to the raw model text.
2. `replaceProjectArtifacts` deletes every artifact for that project, then inserts file, heuristic, and summary rows. `contentPreview` is never set.
3. `syncProjectTechnologies` deletes `ProjectTechnology` rows and inserts the current language list with `source: "code-analysis"`.
4. Two `Insight` rows are **inserted** (`project-index` layer `raw`, `project-summary` layer `derived`). Previous index insights stay.

A failure after the artifact `deleteMany` leaves the project row updated and its artifacts gone until a later index completes. Technology names are case-sensitive unique values; `ensureTechnologies` creates missing rows without catching a concurrent unique violation.
