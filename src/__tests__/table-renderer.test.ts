import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { convertWorkbook } from "../index.js";
import { buildWorkbook } from "./helpers.js";

describe("table rendering (HTML)", () => {
  it("renders a simple 2-column table with header", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["Name", "Age"],
          ["Alice", 30],
          ["Bob", 25],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th>Name</th>
    <th style="text-align: right">Age</th>
    </tr>
    <tr>
    <td>Alice</td>
    <td style="text-align: right">30</td>
    </tr>
    <tr>
    <td>Bob</td>
    <td style="text-align: right">25</td>
    </tr>
</table>`,
    );
  });

  it("right-aligns numeric columns via style attribute", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["Item", "Price"],
          ["Apple", 100],
          ["Banana", 200],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th>Item</th>
    <th style="text-align: right">Price</th>
    </tr>
    <tr>
    <td>Apple</td>
    <td style="text-align: right">100</td>
    </tr>
    <tr>
    <td>Banana</td>
    <td style="text-align: right">200</td>
    </tr>
</table>`,
    );
  });

  it("renders multiple tables on one sheet", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["A", "B"],
          [1, 2],
          [undefined, undefined],
          ["X", "Y"],
          [3, 4],
        ],
      },
    ]);
    const { sheets, markdown } = convertWorkbook(wb);
    expect(sheets[0].regions.filter((r) => r.type === "table").length).toBe(2);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th style="text-align: right">A</th>
    <th style="text-align: right">B</th>
    </tr>
    <tr>
    <td style="text-align: right">1</td>
    <td style="text-align: right">2</td>
    </tr>
</table>

<table>
    <tr>
    <th style="text-align: right">X</th>
    <th style="text-align: right">Y</th>
    </tr>
    <tr>
    <td style="text-align: right">3</td>
    <td style="text-align: right">4</td>
    </tr>
</table>`,
    );
  });

  it("escapes HTML special characters in cell values", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["Col1", "Col2"],
          ["a<b>&c", '"quoted"'],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th>Col1</th>
    <th>Col2</th>
    </tr>
    <tr>
    <td>a&lt;b&gt;&amp;c</td>
    <td>&quot;quoted&quot;</td>
    </tr>
</table>`,
    );
  });

  it("renders merged cells with colspan and rowspan", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:C3",
      A1: { t: "s", v: "Header" },
      B1: { t: "s", v: "" }, // merged child
      C1: { t: "s", v: "Right" },
      A2: { t: "s", v: "Span" },
      B2: { t: "n", v: 10 },
      C2: { t: "n", v: 20 },
      A3: { t: "s", v: "" }, // merged child (rowspan from A2)
      B3: { t: "n", v: 30 },
      C3: { t: "n", v: 40 },
      "!merges": [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // A1:B1 colspan=2
        { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }, // A2:A3 rowspan=2
      ],
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th colspan="2">Header</th>
    <th style="text-align: right">Right</th>
    </tr>
    <tr>
    <td rowspan="2">Span</td>
    <td style="text-align: right">10</td>
    <td style="text-align: right">20</td>
    </tr>
    <tr>
    <td style="text-align: right">30</td>
    <td style="text-align: right">40</td>
    </tr>
</table>`,
    );
  });

  it("converts newlines inside a cell to <br> tags", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B2",
      A1: { t: "s", v: "Header" },
      B1: { t: "s", v: "Note" },
      A2: { t: "s", v: "Alice" },
      B2: { t: "s", v: "line1\nline2" },
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th>Header</th>
    <th>Note</th>
    </tr>
    <tr>
    <td>Alice</td>
    <td>line1<br>line2</td>
    </tr>
</table>`,
    );
  });

  it("renders formula cell using computed value, not formula string", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:C2",
      A1: { t: "s", v: "A" },
      B1: { t: "s", v: "B" },
      C1: { t: "s", v: "Sum" },
      A2: { t: "n", v: 10, w: "10" },
      B2: { t: "n", v: 20, w: "20" },
      C2: { t: "n", v: 30, f: "A2+B2", w: "30" },
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th style="text-align: right">A</th>
    <th style="text-align: right">B</th>
    <th style="text-align: right">Sum</th>
    </tr>
    <tr>
    <td style="text-align: right">10</td>
    <td style="text-align: right">20</td>
    <td style="text-align: right">30</td>
    </tr>
</table>`,
    );
  });

  it("uses emptyCell placeholder for empty table cells", () => {
    // Use 3 columns so rows with one empty cell still meet minColumns=2
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["A", "B", "C"],
          ["val", undefined, "x"],
          ["foo", undefined, "y"],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb, { emptyCell: "—" });
    expect(markdown).toBe(
      `<table>
    <tr>
    <th>A</th>
    <th>B</th>
    <th>C</th>
    </tr>
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
</table>`,
    );
  });

  it("renders as paragraph when every row has only one visible cell due to colspan", () => {
    // All rows have a single cell with colspan spanning all 3 columns
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:C3",
      A1: { t: "s", v: "Title" },
      A2: { t: "s", v: "Subtitle" },
      A3: { t: "s", v: "Content" },
      "!merges": [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
      ],
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe("Title\n\nSubtitle\n\nContent");
  });

  it("renders as table when at least one row has multiple visible cells", () => {
    // Row 0: colspan=3 (1 cell), Row 1: 3 normal cells → should still be a table
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:C2",
      A1: { t: "s", v: "Header" },
      A2: { t: "s", v: "a" },
      B2: { t: "s", v: "b" },
      C2: { t: "s", v: "c" },
      "!merges": [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }],
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th colspan="3">Header</th>
    </tr>
    <tr>
    <td>a</td>
    <td>b</td>
    <td>c</td>
    </tr>
</table>`,
    );
  });

  it("clamps colspan when the merge extends into a hidden column", () => {
    // Merge A1:D1, but column D is hidden.
    // The region is detected as A1:C2 (D excluded because it is hidden).
    // Without clamping, colspan would be 4; with clamping it should be 3.
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:D2",
      A1: { t: "s", v: "Wide Header" },
      A2: { t: "s", v: "a" },
      B2: { t: "s", v: "b" },
      C2: { t: "s", v: "c" },
      D2: { t: "s", v: "hidden" },
      "!merges": [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }], // A1:D1
      "!cols": [undefined, undefined, undefined, { hidden: true }] as XLSX.ColInfo[], // D hidden
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th colspan="3">Wide Header</th>
    </tr>
    <tr>
    <td>a</td>
    <td>b</td>
    <td>c</td>
    </tr>
</table>`,
    );
  });

  it("right-aligns columns with currency-formatted numeric cells", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B3",
      A1: { t: "s", v: "Item" },
      B1: { t: "s", v: "Price" },
      A2: { t: "s", v: "Apple" },
      B2: { t: "n", v: 100, w: "¥100" },
      A3: { t: "s", v: "Banana" },
      B3: { t: "n", v: 200, w: "$200" },
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th>Item</th>
    <th style="text-align: right">Price</th>
    </tr>
    <tr>
    <td>Apple</td>
    <td style="text-align: right">¥100</td>
    </tr>
    <tr>
    <td>Banana</td>
    <td style="text-align: right">$200</td>
    </tr>
</table>`,
    );
  });

  it("renders inline rich text runs as HTML in table cells", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B2",
      A1: { t: "s", v: "Header" },
      B1: { t: "s", v: "Note" },
      A2: { t: "s", v: "Alice" },
      B2: {
        t: "s",
        v: "bold plain",
        // Space is in the plain run to avoid trailing whitespace inside **...**
        r: '<r><rPr><b/></rPr><t>bold</t></r><r><t xml:space="preserve"> plain</t></r>',
      } as XLSX.CellObject,
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb, { richText: true });
    expect(markdown).toBe(
      `<table>
    <tr>
    <th>Header</th>
    <th>Note</th>
    </tr>
    <tr>
    <td>Alice</td>
    <td><strong>bold</strong> plain</td>
    </tr>
</table>`,
    );
  });

  it("right-aligns columns where all data cells are numeric-looking strings (cell.t === s)", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B3",
      A1: { t: "s", v: "Item" },
      B1: { t: "s", v: "Count" },
      A2: { t: "s", v: "Apples" },
      B2: { t: "s", v: "100" }, // string type, numeric-looking → right-aligned via regex
      A3: { t: "s", v: "Bananas" },
      B3: { t: "s", v: "200" },
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th>Item</th>
    <th style="text-align: right">Count</th>
    </tr>
    <tr>
    <td>Apples</td>
    <td style="text-align: right">100</td>
    </tr>
    <tr>
    <td>Bananas</td>
    <td style="text-align: right">200</td>
    </tr>
</table>`,
    );
  });

  it("renders center-aligned cells with text-align: center style", () => {
    const wb = XLSX.utils.book_new();
    const centerAlign = { alignment: { horizontal: "center" } };
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B2",
      A1: { t: "s", v: "Label" },
      B1: { t: "s", v: "Status" },
      A2: { t: "s", v: "Alice" },
      B2: { t: "s", v: "Active", s: centerAlign } as XLSX.CellObject,
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(
      `<table>
    <tr>
    <th>Label</th>
    <th style="text-align: center">Status</th>
    </tr>
    <tr>
    <td>Alice</td>
    <td style="text-align: center">Active</td>
    </tr>
</table>`,
    );
  });

  it("explicit left alignment on numeric data cells prevents right-alignment", () => {
    // Column B contains numeric values (t='n'), which would normally infer right-alignment.
    // Explicit left alignment on the data cells must take priority.
    const leftStyle = { alignment: { horizontal: "left" } };
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B3",
      A1: { t: "s", v: "Item" },
      B1: { t: "s", v: "Count" },
      A2: { t: "s", v: "Alpha" },
      B2: { t: "n", v: 10, s: leftStyle } as XLSX.CellObject,
      A3: { t: "s", v: "Beta" },
      B3: { t: "n", v: 20, s: leftStyle } as XLSX.CellObject,
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    // Explicit left overrides numeric inference — no text-align attribute on any cell
    expect(markdown).not.toContain("text-align: right");
    expect(markdown).not.toContain("text-align: center");
  });

  it("does not right-align columns whose string cells contain scientific notation", () => {
    // Strings like "1e5" don't match the numeric regex → column stays left-aligned
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B3",
      A1: { t: "s", v: "Label" },
      B1: { t: "s", v: "Value" },
      A2: { t: "s", v: "Alpha" },
      B2: { t: "s", v: "1e5" },
      A3: { t: "s", v: "Beta" },
      B3: { t: "s", v: "2.5e-3" },
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    // Scientific notation is not detected as numeric → no right-align style
    expect(markdown).not.toContain("text-align: right");
  });

  it("clamps rowspan when a merge extends beyond the table region end row", () => {
    // The merge A2:A4 extends to row index 3, but the sheet only covers A1:B3 (rows 0–2).
    // The clamping logic: rowspan = min(m.e.r, endRow) - m.s.r + 1 = min(3,2) - 1 + 1 = 2.
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B3",
      A1: { t: "s", v: "Header" },
      B1: { t: "s", v: "Data" },
      A2: { t: "s", v: "Span" },
      B2: { t: "n", v: 10 },
      // A3 is a merge child of A2 (not defined — treated as empty)
      B3: { t: "n", v: 20 },
      "!merges": [
        { s: { r: 1, c: 0 }, e: { r: 3, c: 0 } }, // A2:A4 — row 3 is outside !ref
      ],
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain('rowspan="2"');
    expect(markdown).not.toContain('rowspan="3"');
  });

  it("renders all rows as td when headerRow is false", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["A", "B"],
          [1, 2],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb, { headerRow: false });
    expect(markdown).toBe(
      `<table>
    <tr>
    <td>A</td>
    <td>B</td>
    </tr>
    <tr>
    <td>1</td>
    <td>2</td>
    </tr>
</table>`,
    );
  });
});
