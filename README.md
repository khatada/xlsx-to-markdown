# xlsx-to-md

Node.js / TypeScript library that converts XLSX files to Markdown.

Mixed content is handled automatically — paragraphs of text and tables can coexist on the same sheet, in any order. Multiple tables per sheet are also supported.

## Installation

```bash
npm install xlsx-to-md
```

## Quick Start

```ts
import { convertXlsxToMarkdown } from 'xlsx-to-md';

const result = await convertXlsxToMarkdown('report.xlsx');
console.log(result.markdown);
```

## API

### `convertXlsxToMarkdown(input, options?)`

Reads a file from disk (path string) or an in-memory buffer and returns a `ConvertResult`.

```ts
// From file path
const result = await convertXlsxToMarkdown('report.xlsx');

// From Buffer / Uint8Array
const buffer = await fs.promises.readFile('report.xlsx');
const result = await convertXlsxToMarkdown(buffer);
```

### `convertWorkbook(workbook, options?)`

Converts an already-parsed SheetJS `WorkBook` object. Useful when you manage the SheetJS lifecycle yourself.

```ts
import * as XLSX from 'xlsx';
import { convertWorkbook } from 'xlsx-to-md';

const wb = XLSX.readFile('report.xlsx', { cellStyles: true });
const result = convertWorkbook(wb);
```

### Return value — `ConvertResult`

| Property | Type | Description |
| --- | --- | --- |
| `markdown` | `string` | Combined Markdown for all selected sheets |
| `sheets` | `SheetResult[]` | Per-sheet breakdown |

Each `SheetResult` contains:

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string` | Sheet name |
| `index` | `number` | 0-based sheet index in the workbook |
| `markdown` | `string` | Markdown for this sheet only |
| `regions` | `Region[]` | Detected content regions with type and rendered Markdown |

Each `Region` contains `type` (`"table"` \| `"paragraph"`), row/column bounds, and `markdown`.

## Options

```ts
const result = await convertXlsxToMarkdown('report.xlsx', {
  sheets: ['Summary', 'Detail'],   // include only these sheets (name or 0-based index)
  sheetHeadings: true,             // prepend "## Sheet Name" before each sheet
  headerRow: true,                 // treat first row of every table as a header
  tableDetection: {
    minColumns: 2,                 // minimum columns to classify a region as a table
    minRows: 2,                    // minimum rows to classify a region as a table
    useBorders: true,              // use cell borders as additional table hints
  },
  richText: true,                  // convert bold/italic/hyperlinks to Markdown syntax
  emptyCell: '',                   // placeholder for empty table cells
  dateFormat: 'YYYY-MM-DD',        // date format tokens: YYYY MM DD HH mm ss
  blankLinesBetweenRegions: 1,     // blank lines inserted between regions
});
```

### Option defaults

| Option | Default | Notes |
| --- | --- | --- |
| `sheets` | all sheets | |
| `sheetHeadings` | `"auto"` | Headings added automatically when the workbook has >1 sheet |
| `headerRow` | `true` | |
| `tableDetection.minColumns` | `2` | |
| `tableDetection.minRows` | `2` | |
| `tableDetection.useBorders` | `true` | |
| `richText` | `true` | |
| `emptyCell` | `""` | |
| `dateFormat` | `"YYYY-MM-DD"` | |
| `blankLinesBetweenRegions` | `1` | |

## Content Detection

The library automatically classifies each rectangular block of cells as either a **table** or a **paragraph**:

- **Table** — a contiguous block of rows where each row has `≥ minColumns` filled cells, and the block spans `≥ minRows` rows.
- **Paragraph** — one or more rows where each row has fewer than `minColumns` filled cells (e.g. a single wide text cell, or a heading).

Empty rows act as separators between regions. Regions are emitted in top-to-bottom order, preserving the original document flow.

### Example sheet layout

```
Row 1:  "Section 1: Introduction"          ← paragraph
Row 2:  (empty)
Row 3:  Name    | Department | Salary      ← table header
Row 4:  Alice   | Engineering| 800,000     ← table row
Row 5:  Bob     | Marketing  | 650,000     ← table row
Row 6:  (empty)
Row 7:  "* Figures are in JPY"             ← paragraph
Row 8:  (empty)
Row 9:  Q1      | Q2                       ← second table
Row 10: 1,200   | 1,450
```

Output:

```markdown
Section 1: Introduction

| Name  | Department  | Salary    |
| ----- | ----------- | --------: |
| Alice | Engineering | 800,000   |
| Bob   | Marketing   | 650,000   |

* Figures are in JPY

| Q1    | Q2    |
| ----: | ----: |
| 1,200 | 1,450 |
```

## Rich Text

When `richText: true` (default), cell formatting is converted:

| Excel format | Table output (HTML) | Paragraph output (Markdown) |
| --- | --- | --- |
| Bold | `<strong>text</strong>` | `**text**` |
| Italic | `<em>text</em>` | `_text_` |
| Bold + Italic | `<strong><em>text</em></strong>` | `***text***` |
| Hyperlink | `<a href="url">text</a>` | `[text](url)` |

## Table Formatting Details

Tables are output as HTML (`<table>`) to support all Excel features:

- **Merged cells** — `colspan` and `rowspan` attributes are set on the master (top-left) cell; child cells are omitted entirely.
- **Header row** — rendered inside `<thead>` as `<th>` elements when `headerRow: true`.
- **Column alignment** — columns whose data cells are all numeric are automatically right-aligned (`style="text-align: right"`). Explicit cell alignment takes precedence.
- **Newlines within cells** — converted to `<br>`.
- **HTML escaping** — `&`, `<`, `>`, `"` in cell values are escaped to HTML entities.

## Architecture Decision Records

Design decisions are documented in [`docs/adr/`](docs/adr/).

## Development

```bash
npm install
npm test          # run all tests
npm run build     # compile TypeScript → dist/
```

## License

MIT
