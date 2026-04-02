# ADR-0016: Render single-visible-cell-per-row table regions as paragraphs

## Status

Accepted

## Context

When an Excel region is classified as a table by the region detector, it may still produce
a `<table>` where every `<tr>` contains only one `<td>` or `<th>`. This happens when every
row in the region has a horizontally merged cell whose colspan spans the entire column width
of the region (e.g., a title row that was merged across all columns, repeated for every row).

Such output is semantically a list of text blocks, not a tabular structure. Rendering it as
an HTML table adds noise without conveying any relational data.

## Decision

After the region detector classifies a region as a table, add a secondary check before
invoking the table renderer: count the number of visible cells (non-hidden-column,
non-merge-child) per row. If **every** visible row yields at most 1 cell, route the region
to the paragraph renderer instead of the table renderer.

The check is implemented as `isSingleCellPerRow()` in `table-renderer.ts` and called from
`sheet-converter.ts` before dispatching to `renderTable`.

A region is still rendered as a table as long as at least one row has 2 or more visible
cells, even if other rows have only 1 (e.g., a full-width title row followed by normal
data rows).

## Consequences

- Single-cell-per-row regions are output as plain paragraphs, matching the visual intent
  of the original Excel data
- Regions with mixed row widths (some rows with colspan, some without) continue to render
  as HTML tables, preserving colspan/rowspan fidelity
- The region `type` field in the returned `SheetResult` still reflects the detector's
  classification (`"table"`); only the rendered output changes
