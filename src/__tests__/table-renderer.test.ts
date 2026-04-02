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
