# ADR-0007: Read rich text from cell styles; do not parse raw XML

## Status

Accepted

## Context

We want to convert Excel cell rich text (bold, italic, hyperlinks) to Markdown. There are two main ways to retrieve rich text with SheetJS:

### A. Retrieve from cell styles (`cell.s`)

Specifying `XLSX.read(buf, { cellStyles: true })` stores font information in `cell.s`.

```ts
cell.s.font.bold   // true/false
cell.s.font.italic // true/false
```

- Pros: Works entirely with SheetJS's standard API. No additional parsing needed
- Cons: Only the entire cell's style can be retrieved. If **only part of the text** within a cell is bold (inline rich text), it cannot be retrieved

### B. Parse the raw cell XML (`cell.r`)

SheetJS may store a raw XML string in `cell.r` (in `<r><rPr><b/></rPr><t>text</t></r>` format). Parsing this enables retrieval of inline styles.

- Pros: Can reproduce partial bold/italic
- Cons: High implementation cost for XML parsing. The structure of `cell.r` may change between SheetJS versions. Increases dependencies

## Decision

Adopt **A. Retrieve from cell styles (`cell.s`)**.

Reasons:

1. **Sufficient for practical use**: The most common pattern in business documents is "entire header row is bold" or "specific column is bold", and cell-level styles cover the majority of cases
2. **Implementation simplicity**: Avoiding XML parsing keeps the codebase simple
3. **Maintainability**: Avoids the risk of depending on SheetJS internal format

For inline rich text (only part of a cell is bold), SheetJS returns the whole text as a combined string in `cell.w` (formatted text), so that value is used as-is and no style is applied (style application is performed on the entire cell).

Hyperlinks are extracted by SheetJS as the `cell.l.Target` property, so they are retrieved separately from cell styles and mapped to `[text](url)` format.

## Consequences

- Partial formatting within a cell (e.g., only one character is bold) is not reproduced in Markdown
- When an entire cell is bold / italic, it is output as `**text**` / `_text_`
- Setting the `richText: false` option skips all format conversion and outputs plain text only
