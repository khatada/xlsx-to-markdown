# ADR-0022: Add blank-separator-column exception to the LR-border fill promotion

## Status

Accepted

## Context

ADR-0014 adopted Condition A: when `useBorders` is enabled, empty cells that have both a
left and a right vertical border are promoted to "filled" so that Excel table columns with
bordered-but-empty cells are counted in the density calculation.

This rule works well for table cells, but causes a false positive when two tables are placed
side-by-side with one empty column between them. The separator column may carry left and/or
right border styles inherited from the adjacent table formatting. Under ADR-0014 Condition A
those borders cause the separator cells to be promoted to "filled", collapsing the visual
gap so that region detection sees one wide band instead of two separate tables.

## Decision

Add a band-local exception to Condition A. After building the initial `RowInfo` array
(which still performs the promotion eagerly), identify row-bands (sequences of consecutive
non-empty rows) and for each band roll back the promotion for every column that is a
**blank separator** within that band.

A column is a blank separator in a band when both of the following hold for every row in
the band:

1. No cell in the column has an actual value or falls in the autofilter range
   (`bandColHasRealFill` does not contain the column).
2. No cell in the column has a top or bottom border
   (`bandColHasTopBottom` does not contain the column).

The check is band-local — not sheet-global — so that a column acting as a real table
column in one band is not affected by another band where it happens to be empty.

### Why top/bottom borders distinguish separators from table columns

Horizontal borders (top/bottom) are the primary signal that a column participates in a
table's row structure. A separator column sitting between two tables typically carries
only left/right borders (from the adjacent outer table edges) and has no horizontal
borders of its own. Table columns, on the other hand, always have at least some top or
bottom border somewhere in the band (header line, bottom line, etc.).

### Why the check is band-local

A sheet may have multiple distinct content areas (bands). In one band a column may be a
real table column; in another band the same column may be an empty separator. A global
scan would incorrectly mark the column as "real" everywhere once it finds content in any
band.

### Algorithm (implemented in `sheet-converter.ts`)

1. **Row scan** — build `rowInfos` with full LR-border promotion, and track two
   parallel arrays per row: `borderPromotedCols` (columns promoted only by the LR rule)
   and `borderTopBottomCols` (columns with top or bottom border in this row).
2. **Band identification** — iterate `rowInfos` to find bands of consecutive rows with
   `filledCount > 0`.
3. **Band-local column scan** — for each band, compute `bandColHasTopBottom` (union of
   all `borderTopBottomCols`) and `bandColHasRealFill` (union of all non-promoted
   `filledCols`).
4. **Rollback** — for each row in the band, remove from `filledCols` any promoted column
   that is absent from both `bandColHasTopBottom` and `bandColHasRealFill`; decrement
   `filledCount` and recompute `minCol`/`maxCol` accordingly.
5. Pass the adjusted `rowInfos` to `detectRegions` as before.

## Consequences

### Benefits

- Side-by-side tables separated by one empty column are correctly detected as two
  separate regions even when the separator column has left/right border styles.
- The existing ADR-0014 use-cases (rows of empty bordered cells inside a table) continue
  to work because those columns have top/bottom borders from adjacent rows, which mark
  them as real table columns and prevent rollback.

### Trade-offs

- A slight increase in processing: one extra pass over `rowInfos` to identify bands and
  apply rollback. The pass is O(rows × columns) in the worst case, which is acceptable.
- If a separator column intentionally carries top/bottom borders (unusual), the exception
  will not apply and the column will still be promoted — same behaviour as before this ADR.
