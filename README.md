# xlsx-to-md

Node.js / TypeScript library that converts XLSX files to Markdown.

Mixed content is handled automatically — paragraphs of text and tables can coexist on the same sheet, in any order. Multiple tables per sheet (including side-by-side tables) are supported.

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

Given a sheet like this:

| Name  | Department  | Salary  |
|-------|-------------|---------|
| Alice | Engineering | 800,000 |
| Bob   | Marketing   | 650,000 |

The output is:

```html
<table>
  <thead>
    <tr>
    <th>Name</th>
    <th>Department</th>
    <th style="text-align: right">Salary</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td>Alice</td>
    <td>Engineering</td>
    <td style="text-align: right">800,000</td>
    </tr>
    <tr>
    <td>Bob</td>
    <td>Marketing</td>
    <td style="text-align: right">650,000</td>
    </tr>
  </tbody>
</table>
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
  richText: true,                  // convert bold/italic/hyperlinks to inline markup
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

## Examples

### Multi-sheet workbook

When a workbook has multiple sheets, each sheet gets a `## Heading` by default.

```ts
const result = await convertXlsxToMarkdown('sales.xlsx');
console.log(result.markdown);
```

```markdown
## Q1

<table>
  <thead>
    <tr>
    <th>Month</th>
    <th style="text-align: right">Revenue</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td>Jan</td>
    <td style="text-align: right">1000</td>
    </tr>
    <tr>
    <td>Feb</td>
    <td style="text-align: right">1200</td>
    </tr>
  </tbody>
</table>


## Q2

<table>
  ...
</table>
```

To suppress headings or select specific sheets:

```ts
// No headings even with multiple sheets
const result = await convertXlsxToMarkdown('sales.xlsx', { sheetHeadings: false });

// Only the Summary and Detail sheets, by name
const result = await convertXlsxToMarkdown('report.xlsx', { sheets: ['Summary', 'Detail'] });

// Only the first and third sheets, by index
const result = await convertXlsxToMarkdown('report.xlsx', { sheets: [0, 2] });
```

### Per-sheet results

Use `result.sheets` to process each sheet individually:

```ts
const result = await convertXlsxToMarkdown('report.xlsx');

for (const sheet of result.sheets) {
  console.log(`--- ${sheet.name} ---`);
  console.log(sheet.markdown);

  // Inspect detected regions (table / paragraph)
  for (const region of sheet.regions) {
    console.log(`  ${region.type}: rows ${region.startRow}–${region.endRow}`);
  }
}
```

### Mixed content — text and tables on the same sheet

Text paragraphs and tables can appear anywhere on a sheet.

```
Row 1:  "Section 1: Introduction"
Row 2:  (empty)
Row 3:  Name    | Department  | Salary
Row 4:  Alice   | Engineering | 800,000
Row 5:  Bob     | Marketing   | 650,000
Row 6:  (empty)
Row 7:  "* Figures are in JPY"
```

Output:

```markdown
Section 1: Introduction

<table>
  <thead>
    <tr>
    <th>Name</th>
    <th>Department</th>
    <th style="text-align: right">Salary</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td>Alice</td>
    <td>Engineering</td>
    <td style="text-align: right">800,000</td>
    </tr>
    <tr>
    <td>Bob</td>
    <td>Marketing</td>
    <td style="text-align: right">650,000</td>
    </tr>
  </tbody>
</table>

* Figures are in JPY
```

### Rich text — bold, italic, hyperlinks

With `richText: true` (default), cell formatting is preserved in HTML output.

```ts
const result = await convertXlsxToMarkdown('products.xlsx', { richText: true });
```

Given a sheet with bold, italic, and hyperlink cells:

| Product    | Note       | Link    |
|------------|------------|---------|
| **Widget** | _Featured_ | Details |
| **_Gadget_** | New      | Details |

Output:

```html
<table>
  <thead>
    <tr>
    <th>Product</th>
    <th>Note</th>
    <th>Link</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td><strong>Widget</strong></td>
    <td><em>Featured</em></td>
    <td><a href="https://example.com/widget">Details</a></td>
    </tr>
    <tr>
    <td><strong><em>Gadget</em></strong></td>
    <td>New</td>
    <td><a href="https://example.com/gadget">Details</a></td>
    </tr>
  </tbody>
</table>
```

Rich text also applies to paragraphs (Markdown syntax):

| Excel format | Table output (HTML) | Paragraph output (Markdown) |
| --- | --- | --- |
| Bold | `<strong>text</strong>` | `**text**` |
| Italic | `<em>text</em>` | `_text_` |
| Bold + Italic | `<strong><em>text</em></strong>` | `***text***` |
| Hyperlink | `<a href="url">text</a>` | `[text](url)` |

### Merged cells — colspan and rowspan

Merged cells are automatically rendered with `colspan` and `rowspan`.

```
     A          B       C
1  Header (merged A:B)  Right
2  Span (merged A2:A3)  10     20
3                        30     40
```

Output:

```html
<table>
  <thead>
    <tr>
    <th colspan="2">Header</th>
    <th style="text-align: right">Right</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td rowspan="2">Span</td>
    <td style="text-align: right">10</td>
    <td style="text-align: right">20</td>
    </tr>
    <tr>
    <td style="text-align: right">30</td>
    <td style="text-align: right">40</td>
    </tr>
  </tbody>
</table>
```

### Empty cell placeholder

Use `emptyCell` to fill missing values instead of leaving `<td></td>`:

```ts
const result = await convertXlsxToMarkdown('data.xlsx', { emptyCell: '—' });
```

| A   | B | C |
|-----|---|---|
| val |   | x |
| foo |   | y |

Output:

```html
<tbody>
  <tr>
  <td>val</td>
  <td>—</td>
  <td>x</td>
  </tr>
  <tr>
  <td>foo</td>
  <td>—</td>
  <td>y</td>
  </tr>
</tbody>
```

### No header row

When the first row is data (not a header), set `headerRow: false` to use `<td>` for every row:

```ts
const result = await convertXlsxToMarkdown('raw.xlsx', { headerRow: false });
```

Output uses only `<tbody>` without `<thead>`:

```html
<table>
  <tbody>
    <tr>
    <td>A</td>
    <td>B</td>
    </tr>
    <tr>
    <td>1</td>
    <td>2</td>
    </tr>
  </tbody>
</table>
```

### Date formatting

Control how date cells are displayed with `dateFormat`:

```ts
// Default: YYYY-MM-DD
const result = await convertXlsxToMarkdown('data.xlsx');

// Slash-separated
const result = await convertXlsxToMarkdown('data.xlsx', { dateFormat: 'YYYY/MM/DD' });

// With time
const result = await convertXlsxToMarkdown('data.xlsx', { dateFormat: 'YYYY-MM-DD HH:mm:ss' });
```

Available tokens: `YYYY` `MM` `DD` `HH` `mm` `ss`

## Content Detection

The library uses a recursive row→column→row scan to classify each block of cells as a **table** or **paragraph**.

### Detection algorithm

1. **Row scan** — split the sheet into bands of consecutive non-empty rows (empty rows act as separators)
2. **Column scan** — within each band, find columns that are entirely empty and use them as split points → column sub-ranges
3. **Recurse** — each column sub-range is processed independently by the same algorithm
4. **Classify** — a band that cannot be split further is classified:
   - **Table** — every row has `≥ minColumns` filled cells, and the band spans `≥ minRows` rows
   - **Paragraph** — everything else

### Side-by-side tables

Tables placed horizontally on the same rows (separated by at least one empty column) are detected as independent regions:

```
     A     B     C          E     F     G
1  Name  Score  Grade      Item   Qty  Price   ← two separate headers
2  Alice   90    A         Apple   5    100
3  Bob     75    B         Banana  3     60
```

Column D is empty → detected as two tables (A–C and E–G), each rendered as its own `<table>`.

## Table Formatting Details

Tables are output as HTML (`<table>`) to support all Excel features:

- **Merged cells** — `colspan` and `rowspan` attributes are set on the master (top-left) cell; child cells are omitted entirely.
- **Header row** — rendered inside `<thead>` as `<th>` elements when `headerRow: true`.
- **Column alignment** — columns whose data cells are all numeric are automatically right-aligned (`style="text-align: right"`). Explicit cell alignment takes precedence.
- **Newlines within cells** — converted to `<br>`.
- **HTML escaping** — `&`, `<`, `>`, `"` in cell values are escaped to HTML entities.
- **Formula cells** — the computed value is used; the formula string is never output.
- **Hidden rows/columns** — excluded from output entirely.

## Architecture Decision Records

Design decisions are documented in [`docs/adr/`](docs/adr/).

## Development

```bash
npm install
npm test            # run all tests (vitest)
npm run build       # compile TypeScript → dist/
npm run lint        # oxlint
npm run fmt         # oxfmt
npm run fmt:check   # check formatting (CI)
```

## License

MIT
