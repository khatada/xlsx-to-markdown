# Architecture Decision Records

This directory records design decisions for the xlsx-to-md library in ADR (Architecture Decision Record) format.

## List

| # | Title | Status |
| --- | --- | --- |
| [0001](0001-xlsx-parsing-library.md) | Adopt SheetJS (xlsx) as the XLSX parsing library | Accepted |
| [0002](0002-region-detection-algorithm.md) | Adopt "row density scan" for region detection algorithm | Superseded (by 0010) |
| [0010](0010-recursive-region-detection.md) | Change region detection to "row→column→recursive scan" to separate side-by-side tables | Accepted |
| [0004](0004-column-alignment-inference.md) | Automatically infer right-alignment for numeric columns | Superseded (by 0018) |
| [0006](0006-multi-sheet-headings.md) | Auto-insert "## Sheet Name" headings when multiple sheets are present | Accepted |
| [0007](0007-rich-text-handling.md) | Read rich text from cell styles; do not parse raw XML | Accepted |
| [0008](0008-html-table-format.md) | Change table output format to HTML with full colspan/rowspan support | Accepted |
| [0009](0009-linter-and-formatter.md) | Adopt oxlint as linter and oxfmt as formatter | Accepted |
| [0011](0011-border-based-table-boundary-detection.md) | Use vertical borders (left/right) as the primary signal for table boundary detection | Accepted |
| [0012](0012-exclude-hidden-rows-and-columns.md) | Exclude hidden rows and columns from conversion output | Accepted |
| [0013](0013-hyperlink-formula-extraction.md) | Extract destination URL from =HYPERLINK() formula | Accepted |
| [0014](0014-treat-bordered-and-autofiltered-empty-cells-as-non-empty.md) | Treat empty cells meeting border/autofilter conditions as non-empty | Accepted |
| [0015](0015-secretlint-pre-commit.md) | Run secretlint as a pre-commit hook and in CI to prevent secret leaks | Accepted |
| [0016](0016-single-cell-per-row-renders-as-paragraph.md) | Render single-visible-cell-per-row table regions as paragraphs | Accepted |
| [0017](0017-count-vertically-spanned-columns-for-density.md) | Count vertically-spanned columns in child rows for density | Accepted |
| [0018](0018-right-align-numeric-cells-by-cell-type.md) | Right-align numeric columns by cell type, not only formatted string | Accepted |

## ADR Format

Each ADR is composed of the following sections:

- **Status**: Accepted / Deprecated / Superseded (by ADR-XXXX)
- **Context**: Background and requirements that led to the decision
- **Decision**: What was chosen and why
- **Consequences**: Trade-offs and constraints resulting from this decision
