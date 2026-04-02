# ADR-0010: Change region detection to "row→column→recursive scan" to separate side-by-side tables

## Status

Accepted
Supersedes [ADR-0002](0002-region-detection-algorithm.md) (row density scan).

## Context

The "row density scan" adopted in [ADR-0002](0002-region-detection-algorithm.md) was falsely detecting cases where multiple tables were placed side by side in the same row range (e.g., a member table on the left and a sales table on the right) as a single large table.

```
     A     B     C          E     F     G
1  Name  Score Grade       Item   Qty  Price
2  Alice   90    A         Apple   5    100
3  Bob     75    B         Banana  3     60
```

Even though column D is empty, the row density scan calculated `filledCount` as 6 for each row, resulting in A1:G3 being detected as a single table.

## Decision

Change the region detection algorithm to **row→column→recursive scan**.

### Algorithm

```
detectInRange(rows, colStart, colEnd, opts):
  1. Split into bands at empty rows (groups of consecutive non-empty rows)
  
  2. Detect column gaps for each band:
       filledCols = union of filledCols of all rows in the band (restricted to colStart..colEnd)
       subRanges  = split filledCols into groups of consecutive columns
                    (separate group if gap is 2 or more columns)
  
  3. If subRanges > 1 → recursively call detectInRange for each column sub-range
     If subRanges = 1 → classify with classifyBand(band, subRange) by row density
  
classifyBand(band, colStart, colEnd, opts):
  - If dense rows (filledCount in range ≥ minColumns) ≥ minRows consecutive → table
  - Otherwise                                                                 → paragraph
```

### Definition of column gap

Column indexes are in the same group if they are adjacent (difference = 1). A gap is declared and a new group is started if the difference is 2 or more.

### Recursion termination condition

When `subRanges` becomes 1 (no column gap), `classifyBand` is called to terminate. This prevents infinite loops.

## Consequences

### Benefits

- Side-by-side tables are correctly detected as independent table regions
- The same logic is applied recursively, so it can handle complex layouts (e.g., a heading above side-by-side tables)
- Does not depend on style information

### Trade-offs

- More complex implementation than the row density scan
- Data arranged with alternating empty columns (e.g., values in columns A, C, E with B and D empty) is split into multiple paragraphs. This is intentional behavior, but such layouts are not supported
- The `minColumns` check is based on cell count within the column range, so if a column sub-range is narrow (2 columns) and one cell is empty, it may be downgraded to a paragraph. This can be worked around by lowering `minColumns: 1` or aligning data in the source Excel file
