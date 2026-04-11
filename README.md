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

## Content Detection

The library uses a recursive row→column→row scan to classify each block of cells as a **table** or **paragraph**.

### Detection algorithm

1. **Row scan** — split the sheet into bands of consecutive non-empty rows (empty rows act as separators)
2. **Column scan** — within each band, find columns that are entirely empty and use them as split points → column sub-ranges
3. **Recurse** — each column sub-range is processed independently by the same algorithm
4. **Classify** — a band that cannot be split further is classified:
   - **Table** — every row has `≥ minColumns` filled cells, and the band spans `≥ minRows` rows
   - **Paragraph** — everything else

When `useBorders: true` (default), an empty cell that has both a left and a right border is counted as "filled" — this keeps bordered-but-valueless table cells from breaking table detection. **Exception**: if every cell in a column within a band is blank *and* has no top or bottom border, the column is treated as empty regardless of left/right borders. This ensures that a separator column between two side-by-side tables is still recognised as a gap even when it carries border styles from the adjacent tables.

### Side-by-side tables

Tables placed horizontally on the same rows (separated by at least one empty column) are detected as independent regions:

```
     A     B     C          E     F     G
1  Name  Score  Grade      Item   Qty  Price   ← two separate headers
2  Alice   90    A         Apple   5    100
3  Bob     75    B         Banana  3     60
```

Column D is empty → detected as two tables (A–C and E–G), each rendered as its own `<table>`.

The separator column may carry left/right border styles from the adjacent table formatting. As long as it has no top or bottom border and no values anywhere within the row-band, it is still treated as an empty gap.

### Mixed content example

```
Row 1:  "Section 1: Introduction"          ← paragraph
Row 2:  (empty)
Row 3:  Name    | Department | Salary      ← table header
Row 4:  Alice   | Engineering| 800,000
Row 5:  Bob     | Marketing  | 650,000
Row 6:  (empty)
Row 7:  "* Figures are in JPY"             ← paragraph
Row 8:  (empty)
Row 9:  Q1      | Q2                       ← second table
Row 10: 1,200   | 1,450
```

Output:

```markdown
Section 1: Introduction

<table>
    <tr><th>Name</th><th>Department</th><th style="text-align: right">Salary</th></tr>
    <tr><td>Alice</td><td>Engineering</td><td style="text-align: right">800,000</td></tr>
    <tr><td>Bob</td><td>Marketing</td><td style="text-align: right">650,000</td></tr>
</table>

* Figures are in JPY

<table>
    <tr><th style="text-align: right">Q1</th><th style="text-align: right">Q2</th></tr>
    <tr><td style="text-align: right">1,200</td><td style="text-align: right">1,450</td></tr>
</table>
```

### Recognized table patterns

The table below summarises which layouts are detected as a table and which fall back to a paragraph.

| Excel layout | Detected as | Reason |
| --- | --- | --- |
| 2+ columns × 2+ rows of data | **table** | Meets `minColumns` and `minRows` thresholds |
| Single column of text | **paragraph** | Below `minColumns` (default 2) |
| Single row of data | **paragraph** | Below `minRows` (default 2) |
| Every row has colspan spanning all columns | **paragraph** | Each row renders as one cell — no tabular structure |
| Header row has colspan, data rows have multiple cells | **table** | At least one row has 2+ visible cells |
| Cells with `rowspan` spanning multiple rows | **table** | Rendered as `<td rowspan="N">` with no layout breakage |
| Two blocks separated by an empty column | **two tables** | Column gap triggers independent region detection |

#### Pattern: full-width colspan in all rows → paragraph

When every row in a region is merged across all columns (e.g. a block of title-style cells), the region has no relational structure and is rendered as a paragraph instead of an HTML table.

```
     A        B        C
1  [    Title spanning A:C    ]   ← colspan=3
2  [  Subtitle spanning A:C   ]   ← colspan=3
3  [  Content spanning A:C    ]   ← colspan=3
```

Output:

```markdown
Title

Subtitle

Content
```

#### Pattern: merged header row + normal data rows → table

A full-width merged header (colspan) in the first row is fine as long as at least one data row has multiple cells.

```
     A        B        C
1  [       Report Title       ]   ← colspan=3
2   Name    Score    Grade        ← 3 normal cells
3   Alice    90        A
```

Output:

```html
<table>
    <tr>
    <th colspan="3">Report Title</th>
    </tr>
    <tr>
    <td>Name</td>
    <td style="text-align: right">Score</td>
    <td>Grade</td>
    </tr>
    <tr>
    <td>Alice</td>
    <td style="text-align: right">90</td>
    <td>A</td>
    </tr>
</table>
```

#### Pattern: rowspan across rows → table

Cells with `rowspan` are rendered using the `rowspan` attribute. Because `<thead>`/`<tbody>` are not emitted, a `<th rowspan="N">` that visually spans into data rows does not cause layout breakage.

```
     A        B        C
1   Name    [  Period (B:C)  ]   ← B1:C1 colspan=2
2  Alice     Q1               ← A2:A3 rowspan=2
3             Q2
```

Output:

```html
<table>
    <tr>
    <th>Name</th>
    <th colspan="2">Period</th>
    </tr>
    <tr>
    <td rowspan="2">Alice</td>
    <td>Q1</td>
    </tr>
    <tr>
    <td>Q2</td>
    </tr>
</table>
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
- **Header row** — rendered as `<th>` elements when `headerRow: true`.
- **Column alignment** — columns whose data cells are all numeric (`cell.t === "n"`) are automatically right-aligned (`style="text-align: right"`), including currency-formatted values such as `¥1,000` or `$100`. Explicit cell alignment takes precedence.
- **Newlines within cells** — converted to `<br>`.
- **HTML escaping** — `&`, `<`, `>`, `"` in cell values are escaped to HTML entities.
- **Formula cells** — the computed value is used; the formula string is never output.

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
npm run secretlint  # scan for secrets
```

## License

MIT
