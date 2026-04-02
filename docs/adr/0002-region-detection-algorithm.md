# ADR-0002: Adopt "row density scan" for region detection algorithm

## Status

Superseded (by [ADR-0010](0010-recursive-region-detection.md))

## Context

An XLSX sheet can contain a mixture of tables and text at arbitrary positions. An algorithm to automatically identify these needs to be designed.

Main approaches considered:

### A. Border-based detection

Treat ranges where cells have borders as tables.

- Pros: Can accurately detect data organized as a table in Excel
- Cons: Cannot detect tables without borders (text-only tables). Does not work for files without style information (e.g., xlsx converted from CSV)

### B. Content analysis using regex / heuristics

Classify rows containing only numbers and dates as data rows, and rows containing strings as headers.

- Pros: Can perform semantic classification based on cell content
- Cons: Prone to false positives when numbers appear in paragraphs or when tables contain descriptive cells. High implementation complexity

### C. Row density scan (chosen approach)

Calculate the number of "filled cells" per row and detect rectangular blocks where a certain number of cells are continuously filled as tables.

- Pros: Simple and general-purpose. Does not depend on style information. Users can adjust thresholds via `minColumns` and `minRows`
- Cons: Wide paragraphs (text spanning multiple columns) may be misclassified as tables

## Decision

Adopt **C. Row density scan**.

Algorithm details:

1. For each row, calculate the "valid cell count" excluding merged child cells
2. Classify rows where the valid cell count is ≥ `minColumns` (default: 2) as **dense**, and others as **sparse**
3. Extract groups of consecutive dense rows. Verify that the column ranges within the gap overlap; if they don't, treat them as separate groups
4. If the number of rows in a dense group is ≥ `minRows` (default: 2), classify as a **table**; otherwise downgrade to a **paragraph**
5. Consecutive sparse rows are treated as **paragraphs**
6. Empty rows (valid cell count = 0) act as region delimiters

Border information (`useBorders: true`) is designed into the architecture as a future supplementary hint but is not used for primary judgment in the current implementation.

## Consequences

- Users can adjust detection sensitivity by changing `tableDetection.minColumns` / `tableDetection.minRows`
- Wide paragraphs (e.g., a caption spanning 2 columns) may unintentionally be classified as tables. This can be avoided by increasing `minColumns` or inserting an empty row
- Works even for files without style information (minimum functionality is guaranteed)
