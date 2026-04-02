# ADR-0017: Count vertically-spanned columns in child rows for density

## Status

Accepted

## Context

The region detector classifies a band of rows as a table when every row has at least
`minColumns` filled cells. Before this change, cells that are merge children were
unconditionally skipped when building `RowInfo`, so a row entirely covered by a
vertical rowspan from a row above would have fewer filled columns than the actual
visual column count.

For example, with a 2-column table where column A is merged across 3 rows (rowspan=3):

```
     A       B
1  [Name]   Q1    ← filledCount = 2 ✓
2  [ ↕  ]   Q2    ← filledCount = 1 ✗  (A2 is a merge child, skipped)
3  [ ↕  ]   Q3    ← filledCount = 1 ✗
```

With `minColumns: 2` (default), rows 2 and 3 fall below the threshold and the entire
band is classified as a paragraph instead of a table.

## Decision

When a child cell belongs to a **vertical** merge (the master cell is in an earlier row,
i.e. `masterPos.r < r`) and the master cell has a non-empty value, count that column as
filled in the child row's `RowInfo`.

This mirrors the existing "issue 6" treatment for horizontal merges: a master cell that
spans multiple columns already contributes all those columns to the row's density.
Vertical spans receive the same treatment for child rows.

The check is added inside the child-cell branch in `sheet-converter.ts`, before the
`continue` statement that skips the rest of processing for child cells.

Master cells with no value are excluded so that an empty merged cell does not inflate
the density of rows below it.

## Consequences

- Tables with rowspan headers or rowspan body cells are now correctly detected as tables
  regardless of the `minColumns` threshold
- Rows that happen to have all their columns covered by a vertical rowspan from above
  now count those columns the same way a row with explicit cell values would
- No change to the rendered output — the fix only affects region classification, not HTML
  generation
