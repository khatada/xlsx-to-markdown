# ADR-0018: Right-align numeric columns by cell type, not only formatted string

## Status

Accepted  
Supersedes [ADR-0004](0004-column-alignment-inference.md)

## Context

ADR-0004 inferred right-alignment for a column when all non-empty data cells matched
the pattern `/^-?[\d,]+(\.\d+)?%?$/`. This pattern was chosen to detect numbers from
their formatted display string (e.g. `cell.w`).

A limitation noted in ADR-0004 was:

> Currency columns with currency symbols (e.g. `¥1,000`) will be left-aligned. To
> right-align these, the cell alignment must be explicitly set to right in Excel.

In practice, currency and locale-formatted numbers (`¥1,000`, `$100`, `€50.00`,
`1 234,56`) are returned by SheetJS with `cell.t === "n"` regardless of how the display
string looks. The formatted string (`cell.w`) often includes symbols or separators that
the previous regex could not match.

Using the display string as the sole signal means that columns containing currency
values are systematically left-aligned even when the user expects right-alignment —
the same default Excel applies to all numeric cells.

## Decision

Extend the numeric check in `inferColumnAlignments` (`table-renderer.ts`) to also
accept `cell.t === "n"` (SheetJS numeric cell type) as a sufficient condition for
right-alignment inference:

```typescript
const numericByType = cell?.t === "n";
if (!numericByType && !/^-?[\d,]+(\.\d+)?%?$/.test(v)) allNumeric = false;
```

Priority order (unchanged from ADR-0004):
1. Explicit cell alignment (`cell.s.alignment.horizontal`) — highest priority
2. All data cells in the column are numeric (`cell.t === "n"` **or** pattern match) → right
3. Otherwise → left

The string pattern is kept as a fallback for cases where a cell has no type information.

## Consequences

- Currency-formatted columns (`¥1,000`, `$100`, `€50`) are now automatically right-aligned
- The change is purely additive; all cases that matched the old regex continue to work
- Text cells that visually resemble numbers (e.g. a string cell `"100"` with `cell.t === "s"`)
  are still left-aligned — only genuine numeric cells are affected
- ADR-0004 is superseded; its "known limitation" about currency symbols is resolved
