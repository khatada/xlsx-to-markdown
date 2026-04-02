# ADR-0001: Adopt SheetJS (xlsx) as the XLSX parsing library

## Status

Accepted

## Context

A library for parsing XLSX files needs to be selected. The main options available in the Node.js ecosystem are:

| Library | Weekly downloads (approx.) | Style access | Browser support | License |
| --- | --- | --- | --- | --- |
| `xlsx` (SheetJS CE) | ~10M | Yes (cellStyles) | Yes | Apache-2.0 |
| `exceljs` | ~2M | Yes | No | MIT |
| `node-xlsx` | ~1M | No | No | Apache-2.0 |

Requirements for this library:

- Retrieve not only cell values but also **style information** (bold, italic, borders, alignment)
- Retrieve **merged cell information** (`!merges`)
- Operate in the browser as well (as a future extension)
- Read directly from a Buffer / Uint8Array

## Decision

Adopt `xlsx` (SheetJS Community Edition).

Reasons:

1. **Style information access**: The `XLSX.read(buf, { cellStyles: true })` option stores font and border information in `cell.s`. Few other major libraries can retrieve equivalent information.
2. **Largest ecosystem**: Highest weekly download count and Stack Overflow coverage.
3. **Rich utility functions**: Helpers like `encode_cell`, `decode_range`, and `SSF.parse_date_code` cover address calculation and date conversion, reducing implementation cost.
4. **Browser/Node.js dual support**: Can also be used in web frontends in the future.

## Consequences

- A dependency on the `xlsx` package is introduced. SheetJS CE is Apache-2.0 licensed, so there are no issues with commercial use.
- Enabling `cellStyles: true` slightly slows down parsing (on the order of hundreds of milliseconds for large files). This is acceptable because style information is required.
- Specifying `cellDates: false` receives dates as serial numbers, enabling custom formatting via `SSF.parse_date_code`.
