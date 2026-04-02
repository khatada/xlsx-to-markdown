# ADR-0011: Use vertical borders (left/right) as the primary signal for table boundary detection

## Status

Accepted

## Context

The `classifyBand` in [ADR-0010](0010-recursive-region-detection.md) distinguishes tables from paragraphs solely based on row "column density" (`filledCount >= minColumns`). This approach has two problems.

**Problem 1: Paragraph title gets pulled into a table**

When a title row sits directly above a table without an empty row, and that title spans multiple columns (high density), the title row is falsely detected as the first row of the table.

```
Row 0: "Sales Summary" | "FY2024" | "Final"    ← density 3 → treated as table
Row 1:  "Product"      | "Qty"    | "Amount"   ← table header
Row 2:  "Apple"        | 5        | 500
```

**Problem 2: Rows with only vertical borders are treated as paragraphs**

Some Excel table styles express column structure with only vertical borders (left/right) and omit horizontal borders (top/bottom). Such rows may have a `filledCount` below `minColumns` and get downgraded to paragraphs.

## Decision

Add `hasVerticalBorder` (true if at least one cell in the row has a left or right border) to `RowInfo`, and apply the following two rules in `classifyBand`.

### Rule 1: Detect table start boundary

When `useBorders: true` (default), if a row with `hasVerticalBorder = true` exists in the band, **output all rows before the first vertical-border row as paragraphs**. This fixes the table start position by border regardless of title row density.

### Rule 2: Extend table row criteria

When `useBorders: true`, determine whether a row is a "table candidate" using the following condition:

```
isTableCandidate(row) =
  filledCount >= minColumns           // traditional density condition
  || (useBorders && row.hasVerticalBorder)  // additional vertical-border condition
```

This allows rows with only vertical borders (no horizontal borders) to be treated as part of a table.

### Why horizontal borders (top/bottom) are not used

Horizontal borders (top/bottom) are also used as paragraph underlines or dividers, making them an inappropriate signal for column structure. Vertical borders (left/right) represent boundaries between cells and have a higher correlation with table layouts.

### Fallback when `useBorders: false`

Specifying `useBorders: false` causes only the traditional density-based classification to operate; border information is not used at all.

## Consequences

### Benefits

- Title/caption rows above a table without an empty row are correctly classified as paragraphs
- Tables using only vertical borders (no horizontal borders) are correctly recognized as tables

### Trade-offs

- Requires XLSX cell styles (`cellStyles: true`). For CSV or XLSX without style information, `hasVerticalBorder` is always `false` and falls back to density-based classification (no regression)
- With `useBorders: true` (default), any row with a vertical border becomes a table candidate regardless of density. Paragraphs that intentionally have vertical borders can be excluded by setting `useBorders: false`
