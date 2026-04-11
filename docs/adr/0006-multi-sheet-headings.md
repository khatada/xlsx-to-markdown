# ADR-0006: Auto-insert "## Sheet Name" headings when multiple sheets are present

## Status

Superseded (by [ADR-0020](0020-escape-markdown-in-sheet-name-headings.md))

## Context

When a workbook contains multiple sheets, combining the content of each sheet into a single Markdown document makes it impossible to tell which sheet the content belongs to.

The following behavior options were considered:

| Behavior | `sheetHeadings` value |
| --- | --- |
| Never add headings | `false` |
| Always add headings | `true` |
| Add headings only when there are 2 or more sheets | `"auto"` |

## Decision

Default to `"auto"` and **auto-insert `## Sheet Name` headings only when there are 2 or more sheets**.

Reasons:

1. **Single sheet**: Headings are usually unnecessary. Having a heading adds extra structure to the output Markdown and gets in the way when pasting into existing documents
2. **Multiple sheets**: Sheet names provide important context, so auto-insertion increases usability
3. **User override**: Since `sheetHeadings: true` / `false` can force the behavior, `"auto"` is simply the sensible default

Heading level `##` (h2) was chosen because h1 is often reserved as the document title, and it is common for content to start at h2.

## Consequences

- Single-sheet workbooks have no heading by default, making it easy to embed the output directly into another document
- Multi-sheet workbooks get sheet names as h2 headings, which can also be used for automatic table-of-contents generation
- If sheet names contain Markdown special characters (e.g., `#`, `*`), they are not currently escaped. Recorded as a future improvement
