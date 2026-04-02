# ADR-0008: Change table output format to HTML with full colspan/rowspan support

## Status

Accepted
Supersedes ADR-0003 (GFM table format) and ADR-0005 (substitute merged cells with empty cells).

## Context

[ADR-0003](0003-markdown-table-format.md) adopted the GFM table format, but the following limitations became apparent:

- **Cannot represent merged cells**: GFM tables have no colspan/rowspan syntax. [ADR-0005](0005-merged-cell-handling.md) adopted a design that substituted merged child cells with empty cells. As a result, Excel tables with header spans or vertical merges were displayed inaccurately in Markdown
- **Frequency in real business documents**: Actual Excel files such as invoices and reports make heavy use of cell merging, and information loss is often unacceptable

Embedding HTML in Markdown documents is permitted by the CommonMark spec, and GitHub, GitLab, Notion, and major static site generators all render HTML tables inside Markdown.

## Decision

Change table regions to output as **HTML tables** (`<table>`).

### Output structure

```html
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th colspan="2">Period</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">Alice</td>
      <td style="text-align: right">Q1</td>
      <td style="text-align: right">Q2</td>
    </tr>
    <tr>
      <td style="text-align: right">100</td>
      <td style="text-align: right">200</td>
    </tr>
  </tbody>
</table>
```

### Handling merged cells

- Add `colspan` / `rowspan` attributes to the top-left master cell of a merge range
- Merged child cells (non-master) are **not output** as `<td>` / `<th>` elements (omitting the element makes colspan/rowspan work correctly)

### Header row

- `headerRow: true` (default): Render the first row as `<th>` within `<thead>`
- `headerRow: false`: Do not output `<thead>`; render all rows as `<td>` within `<tbody>`

### Alignment

- Automatic right-alignment inference for numeric columns ([ADR-0004](0004-column-alignment-inference.md)) is preserved
- Alignment is expressed with `style="text-align: right/center"` attributes rather than GFM separator notation
- Default (left-aligned) is kept simple by omitting the `style` attribute

### HTML escaping

Escape `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;` in cell values.

### Rich text

Since the paragraph renderer continues to use Markdown syntax (`**bold**`, `_italic_`), a `rawValue` field (raw text without format applied) is added to `CellData`, and the table renderer uses this to apply HTML tags (`<strong>`, `<em>`, `<a>`).

| Format | HTML output |
| --- | --- |
| Bold | `<strong>text</strong>` |
| Italic | `<em>text</em>` |
| Bold + Italic | `<strong><em>text</em></strong>` |
| Hyperlink | `<a href="url">text</a>` |

## Consequences

### Benefits

- Excel cell merging (colspan/rowspan) can be fully reproduced
- Renders accurately in major tools such as GitHub, GitLab, and Notion
- Future styling additions such as column widths via `<colgroup>` are possible

### Trade-offs

- **Reduced readability**: Compared to GFM tables, the Markdown file is harder to read as plain text
- **Parser dependency**: Some Markdown parsers that do not support HTML blocks may display `<table>` as-is. However, all CommonMark-compliant parsers support it
- **Indentation**: Output uses 2-space indentation for readability; additional processing is needed if minification is required
