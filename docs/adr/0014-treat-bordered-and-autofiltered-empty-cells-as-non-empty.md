# ADR-0014: Treat empty cells meeting border/autofilter conditions as non-empty

## Status

Accepted

## Context

When converting sheets containing Excel ListObjects (table format), empty cells inside the table were
being treated as "empty rows", causing the table to be split or misclassified as a paragraph due
to low column density.

Two specific cases were causing false detections:

1. **Empty cells with both left and right vertical borders** — Excel table styles often apply vertical
   borders to indicate column boundaries. Because empty cells also have borders, excluding them from
   density calculation caused the table to be split.

2. **Empty cells within `!autofilter` range** — SheetJS expands Excel ListObject metadata into
   `ws["!autofilter"].ref`. Because ListObjects always have an autofilter, the presence of this
   property is a reliable signal of a table range.

## Decision

Add the following 2 conditions to the `filledCols` construction loop in `sheet-converter.ts` so that
cells without values are added to `filledCols` and included in density calculation when they meet
these conditions.

### Condition A — Both left and right vertical borders (only when `useBorders` is enabled)

```typescript
if (
  opts.tableDetection.useBorders &&
  b.left?.style &&
  b.right?.style &&
  !filledCols.has(c)
) {
  filledCols.add(c);
  filledCount++;
}
```

- Only applies when **both** left and right border styles exist (one side only is excluded).
- Not applied when `useBorders: false`.

### Condition B — Within `!autofilter` range

```typescript
const autofilterRange = ws["!autofilter"]?.ref
  ? XLSX.utils.decode_range(ws["!autofilter"].ref)
  : null;

// ...

} else if (inAutofilter && !filledCols.has(c)) {
  filledCols.add(c);
  filledCount++;
}
```

- Autofilter can also be applied to non-ListObject ranges (plain autofilter), but treating those
  as tables is also natural, so no distinction is made.
- Always effective regardless of the `useBorders` setting.

## Consequences

- **Improvement**: Sheets containing Excel ListObjects now correctly detect the table as a single region.
- **Trade-off**: Ranges with `!autofilter` set are treated as tables regardless of the user's intent.
  This also applies to sheets with autofilter only (non-ListObject).
- **Future improvement**: Once SheetJS parses `xl/tables/*.xml` and provides `ws["!tables"]`,
  switching to more accurate ListObject detection would be possible.
