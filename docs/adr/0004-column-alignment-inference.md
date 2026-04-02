# ADR-0004: Automatically infer right-alignment for numeric columns

## Status

Accepted

## Context

The separator row in a GFM table allows per-column alignment to be specified. Excel cells have an "alignment" setting, but cells with the default (General) alignment have no explicit left/right specification — numbers are displayed right-aligned and strings left-aligned.

A decision is needed on how to handle alignment information in the Markdown output.

## Decision

Determine column alignment using the following priority order:

1. If an **explicit alignment setting** (`cell.s.alignment.horizontal`) exists on the cell, use it
2. If all non-empty cells in the data column (excluding the header row) match the numeric pattern (`/^-?[\d,]+(\.\d+)?%?$/`), use **right-alignment** (`---:`)
3. Otherwise use **left-alignment** (`---`)

Center-alignment is only applied when explicitly set; it is not used in automatic inference.

### Numeric pattern targets

| Value example | Judgment |
| --- | --- |
| `1234` | Numeric |
| `-5.6` | Numeric |
| `1,234,567` | Numeric (comma-separated) |
| `98.5%` | Numeric (percent) |
| `¥1,000` | Non-numeric (contains currency symbol) |
| `N/A` | Non-numeric |

Values containing currency symbols or units are treated as non-numeric and left-aligned. This is because when SheetJS returns numbers as formatted strings (`cell.w`), they may include currency symbols or units.

## Consequences

- If the user has explicitly set alignment in Excel, it is reflected in the output
- Numeric columns are automatically right-aligned, so numbers render with digit alignment
- Currency columns with currency symbols (e.g., `¥1,000`) will be left-aligned. To right-align these, the cell alignment must be explicitly set to right in Excel
