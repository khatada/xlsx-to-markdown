# ADR-0019: Parse cell.r XML to reproduce per-run inline rich text

## Status

Accepted
Supersedes [ADR-0007](0007-rich-text-handling.md)

## Context

ADR-0007 adopted cell-style-only rich text (`cell.s.font.bold / italic`) and explicitly deferred
inline rich text (only part of a cell is bold/italic) due to implementation cost and the risk of
depending on SheetJS internals.

In practice, a common business pattern is mixing bold labels with plain values in a single cell
(e.g. "**Note:** see below"). Cell-level styling cannot reproduce this — the entire cell is either
bold or not.

SheetJS stores the OOXML rich-text XML in `cell.r` (typed `string | undefined`). The XML follows
the standard OOXML format:

```xml
<r><rPr><b/></rPr><t>bold</t></r><r><t xml:space="preserve"> normal</t></r>
```

Parsing this with a small set of regexes is sufficient for the subset of properties we need
(bold, italic) and does not require an additional dependency.

## Decision

When `opts.richText` is true and `cell.r` is present, parse the rich-text XML using
`parseRichTextRuns()` in `cell-formatter.ts`:

1. Extract each `<r>` run element.
2. Check `<rPr>` for `<b>` (bold) and `<i>` (italic) markers.
3. Unescape XML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`).
4. Build two representations from the runs:
   - **`value`** (Markdown, for paragraph renderer): apply `**...**` / `_..._` per run.
     Leading/trailing whitespace is moved outside the markers to satisfy CommonMark
     right-flanking delimiter rules.
   - **`richTextHtml`** (HTML, for table renderer): apply `<strong>` / `<em>` per run,
     with HTML-escaped text and `\n` → `<br>`.
5. Return early with `richTextHtml` set on `CellData`; fall back to the existing
   cell-style path when `cell.r` is absent or contains no `<r>` elements.

The table renderer (`formatCellHtml`) uses `richTextHtml` when it is defined, bypassing
the single-cell bold/italic path.

Hyperlinks wrapping inline rich text are applied at the whole-cell level (Markdown
`[inline-md](url)`, HTML `<a href="url">inline-html</a>`).

## Consequences

- Per-run bold/italic in a single cell is now reproduced in both Markdown and HTML output
- The regex-based parser handles only bold and italic; other run properties (font size, color,
  underline, strikethrough) are still ignored
- Cells without `cell.r` continue to use the cell-style path — no regression
- `CellData` gains an optional `richTextHtml?: string` field
- If SheetJS changes the format of `cell.r` in a future version, the parser may need updating
