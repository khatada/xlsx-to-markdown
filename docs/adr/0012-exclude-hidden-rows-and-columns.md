# ADR-0012: Exclude hidden rows and columns from conversion output

## Status

Accepted

## Context

Excel allows rows and columns to be set as hidden. Hidden rows and columns exist in the spreadsheet but are invisible in print and screen display.

Before this change, hidden rows and columns were also included in the Markdown output, causing confidential or auxiliary data to unintentionally appear in the output.

## Decision

Exclude rows and columns where `ws['!rows'][r]?.hidden` and `ws['!cols'][c]?.hidden` are `true` from the entire conversion process.

Exclusion is performed in two stages:

1. **Region detection phase (`sheet-converter.ts`)**: Skip hidden rows when constructing `RowInfo` and do not add hidden columns to `filledCols`. Hidden rows are not included in the `rowInfos` array and are therefore excluded from density calculation and region boundary judgment.

2. **Rendering phase (`renderTable` / `renderParagraph`)**: Receive `hiddenRows` / `hiddenCols` as arguments and skip them in loops. This ensures that hidden rows within the `startRow`–`endRow` range of a region are not output.

## Consequences

### Benefits

- Hidden rows and columns no longer appear in the Markdown output, matching what Excel displays
- The risk of confidential data unintentionally appearing in conversion output is reduced

### Trade-offs

- Use cases that need to output hidden row/column content (e.g., data migration) are not supported. If needed, unhide the rows/columns in Excel before converting
- Hidden rows are treated as "non-existent rows" rather than "rows equivalent to empty rows" during region detection, so two rows adjacent across a hidden row are placed in the same band. This matches Excel's display, but may change data structure
