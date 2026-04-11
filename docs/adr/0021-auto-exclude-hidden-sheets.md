# ADR-0021: Auto-exclude hidden sheets from conversion output

## Status

Accepted

## Context

Excel workbooks can mark sheets as hidden (`Hidden=1`) or very hidden (`Hidden=2`) via
`wb.Workbook.Sheets[i].Hidden`. Before this change, all sheets in `wb.SheetNames` were
processed regardless of their visibility, meaning that hidden sheets — which are not visible
to users in Excel — appeared in the Markdown output.

This mismatch between Excel's display behaviour and the conversion output was unexpected:
a user who hides a sheet typically does not want it included in a document export.

## Decision

When no explicit `sheets` filter is provided, process only **visible** sheets by filtering
`wb.SheetNames` against the workbook metadata:

```typescript
sheetNames = allSheetNames.filter((_, i) => {
  const meta = workbook.Workbook?.Sheets?.[i];
  return !meta?.Hidden; // Hidden=0 visible, Hidden=1 hidden, Hidden=2 very hidden
});
```

When an explicit `sheets` filter (by name or index) is provided, the filter is applied
as-is **without** the visibility check. This allows callers to explicitly request a hidden
sheet when needed.

The `sheetHeadings: "auto"` logic counts only the visible (post-filter) sheets, so a workbook
where all but one sheet are hidden will not add a heading.

## Consequences

- Hidden and very-hidden sheets are excluded by default, matching Excel's display behaviour
- Users who need hidden sheet content can still access it via the `sheets` option
- Workbooks without `wb.Workbook` metadata (e.g., programmatically constructed) continue
  to process all sheets as before (the filter returns `true` when metadata is absent)
