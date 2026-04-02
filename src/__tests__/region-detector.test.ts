import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { detectRegions } from "../region-detector.js";
import { resolveOptions } from "../options.js";
import { convertWorkbook } from "../index.js";
import type { RowInfo } from "../types.js";

function makeRowInfo(
  index: number,
  cols: number[],
  hasBorder = false,
  hasVerticalBorder = false,
): RowInfo {
  const filledCols = new Set(cols);
  const minCol = cols.length ? Math.min(...cols) : -1;
  const maxCol = cols.length ? Math.max(...cols) : -1;
  return {
    index,
    filledCols,
    minCol,
    maxCol,
    filledCount: cols.length,
    hasBorder,
    hasVerticalBorder,
  };
}

describe("detectRegions", () => {
  const opts = resolveOptions();

  it("detects a single table", () => {
    const rows = [makeRowInfo(0, [0, 1, 2]), makeRowInfo(1, [0, 1, 2]), makeRowInfo(2, [0, 1, 2])];
    const regions = detectRegions(rows, opts);
    expect(regions).toHaveLength(1);
    expect(regions[0].type).toBe("table");
    expect(regions[0].startRow).toBe(0);
    expect(regions[0].endRow).toBe(2);
  });

  it("detects paragraph before and after a table", () => {
    const rows = [
      makeRowInfo(0, [0]), // paragraph
      makeRowInfo(1, []), // gap
      makeRowInfo(2, [0, 1]), // table row 1
      makeRowInfo(3, [0, 1]), // table row 2
      makeRowInfo(4, []), // gap
      makeRowInfo(5, [0]), // paragraph
    ];
    const regions = detectRegions(rows, opts);
    expect(regions[0].type).toBe("paragraph");
    expect(regions[1].type).toBe("table");
    expect(regions[2].type).toBe("paragraph");
  });

  it("demotes a single dense row to paragraph (not enough rows for table)", () => {
    const rows = [
      makeRowInfo(0, [0, 1, 2]), // only 1 row — below minRows=2
    ];
    const regions = detectRegions(rows, opts);
    expect(regions).toHaveLength(1);
    expect(regions[0].type).toBe("paragraph");
  });

  it("detects two separate tables separated by a gap", () => {
    const rows = [
      makeRowInfo(0, [0, 1]),
      makeRowInfo(1, [0, 1]),
      makeRowInfo(2, []), // gap
      makeRowInfo(3, [0, 1]),
      makeRowInfo(4, [0, 1]),
    ];
    const regions = detectRegions(rows, opts);
    expect(regions.filter((r) => r.type === "table")).toHaveLength(2);
  });

  it("respects custom minColumns option", () => {
    const custom = resolveOptions({ tableDetection: { minColumns: 3 } });
    const rows = [
      makeRowInfo(0, [0, 1]), // only 2 cols, below minColumns=3
      makeRowInfo(1, [0, 1]),
    ];
    // Should not be detected as a table
    const regions = detectRegions(rows, custom);
    expect(regions.every((r) => r.type === "paragraph")).toBe(true);
  });

  it("returns no regions for an all-empty sheet", () => {
    const rows = [makeRowInfo(0, []), makeRowInfo(1, []), makeRowInfo(2, [])];
    const regions = detectRegions(rows, opts);
    expect(regions).toHaveLength(0);
  });

  it("treats a single non-empty row as a paragraph regardless of column count", () => {
    // 5 filled columns but only 1 row — below minRows=2
    const rows = [makeRowInfo(0, [0, 1, 2, 3, 4])];
    const regions = detectRegions(rows, opts);
    expect(regions).toHaveLength(1);
    expect(regions[0].type).toBe("paragraph");
  });

  it("side-by-side tables (same rows, non-overlapping columns) are detected as separate regions", () => {
    // Table A: cols 0-2, Table B: cols 4-6 — column 3 is empty (gap)
    // The column-gap scan splits them into two independent table regions.
    const rows = [
      makeRowInfo(0, [0, 1, 2, 4, 5, 6]),
      makeRowInfo(1, [0, 1, 2, 4, 5, 6]),
      makeRowInfo(2, [0, 1, 2, 4, 5, 6]),
    ];
    const regions = detectRegions(rows, opts);
    expect(regions).toHaveLength(2);
    expect(regions.every((r) => r.type === "table")).toBe(true);
    // Table A: cols 0–2
    expect(regions[0].startCol).toBe(0);
    expect(regions[0].endCol).toBe(2);
    // Table B: cols 4–6
    expect(regions[1].startCol).toBe(4);
    expect(regions[1].endCol).toBe(6);
  });

  describe("border-based table start detection (useBorders: true)", () => {
    const borderOpts = resolveOptions({ tableDetection: { useBorders: true } });

    // Helper: row with vertical borders (left/right) — indicates column structure
    const vBorder = (index: number, cols: number[]) => makeRowInfo(index, cols, true, true);
    // Helper: row with horizontal-only borders (top/bottom) — no column structure
    const hBorder = (index: number, cols: number[]) => makeRowInfo(index, cols, true, false);
    // Helper: row with no borders
    const noBorder = (index: number, cols: number[]) => makeRowInfo(index, cols, false, false);

    it("dense rows before first vertical-bordered row become a paragraph", () => {
      // Row 0: title row — 3 filled cols, no vertical border → should be paragraph
      // Rows 1-2: table rows — vertical borders
      const rows = [
        noBorder(0, [0, 1, 2]), // dense but no vertical border
        vBorder(1, [0, 1, 2]), // table header (vertical border)
        vBorder(2, [0, 1, 2]), // table data (vertical border)
      ];
      const regions = detectRegions(rows, borderOpts);
      expect(regions).toHaveLength(2);
      expect(regions[0].type).toBe("paragraph");
      expect(regions[0].startRow).toBe(0);
      expect(regions[0].endRow).toBe(0);
      expect(regions[1].type).toBe("table");
      expect(regions[1].startRow).toBe(1);
      expect(regions[1].endRow).toBe(2);
    });

    it("multiple leading rows without vertical borders become a single paragraph region", () => {
      const rows = [
        noBorder(0, [0, 1]),
        hBorder(1, [0, 1]), // horizontal-only border → still not a table start
        vBorder(2, [0, 1]),
        vBorder(3, [0, 1]),
      ];
      const regions = detectRegions(rows, borderOpts);
      expect(regions).toHaveLength(2);
      expect(regions[0].type).toBe("paragraph");
      expect(regions[0].startRow).toBe(0);
      expect(regions[0].endRow).toBe(1);
      expect(regions[1].type).toBe("table");
      expect(regions[1].startRow).toBe(2);
    });

    it("sparse rows with vertical borders are treated as table rows", () => {
      // Rows with only 1 filled col but vertical borders → part of the table
      const rows = [
        vBorder(0, [0, 1]), // dense + vertical border → table header
        vBorder(1, [0]), // sparse but vertical border → still table row
        vBorder(2, [0, 1]), // dense + vertical border → table row
      ];
      const regions = detectRegions(rows, borderOpts);
      expect(regions).toHaveLength(1);
      expect(regions[0].type).toBe("table");
      expect(regions[0].startRow).toBe(0);
      expect(regions[0].endRow).toBe(2);
    });

    it("rows with only horizontal borders are not promoted to table rows by borders alone", () => {
      // hBorder row is sparse AND has no vertical borders → paragraph
      const rows = [
        vBorder(0, [0, 1]),
        vBorder(1, [0, 1]),
        hBorder(2, [0]), // horizontal-only, sparse → paragraph
      ];
      const regions = detectRegions(rows, borderOpts);
      expect(regions).toHaveLength(2);
      expect(regions[0].type).toBe("table");
      expect(regions[0].endRow).toBe(1);
      expect(regions[1].type).toBe("paragraph");
      expect(regions[1].startRow).toBe(2);
    });

    it("falls back to density when no row has vertical borders", () => {
      // All rows without vertical borders → density-based classification as before
      const rows = [
        noBorder(0, [0]), // sparse → paragraph
        noBorder(1, [0, 1]), // dense
        noBorder(2, [0, 1]), // dense → table (minRows satisfied)
      ];
      const regions = detectRegions(rows, borderOpts);
      expect(regions[0].type).toBe("paragraph");
      expect(regions[1].type).toBe("table");
    });

    it("when useBorders is false, leading dense rows are classified as table", () => {
      const noBorderOpts = resolveOptions({ tableDetection: { useBorders: false } });
      const rows = [noBorder(0, [0, 1, 2]), vBorder(1, [0, 1, 2]), vBorder(2, [0, 1, 2])];
      const regions = detectRegions(rows, noBorderOpts);
      expect(regions).toHaveLength(1);
      expect(regions[0].type).toBe("table");
      expect(regions[0].startRow).toBe(0);
    });
  });

  it("side-by-side tables are rendered as two separate HTML tables", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:G3",
      // Table A (cols A–C)
      A1: { t: "s", v: "Name" },
      B1: { t: "s", v: "Score" },
      C1: { t: "s", v: "Grade" },
      A2: { t: "s", v: "Alice" },
      B2: { t: "n", v: 90 },
      C2: { t: "s", v: "A" },
      A3: { t: "s", v: "Bob" },
      B3: { t: "n", v: 75 },
      C3: { t: "s", v: "B" },
      // Table B (cols E–G, col D is empty)
      E1: { t: "s", v: "Item" },
      F1: { t: "s", v: "Qty" },
      G1: { t: "s", v: "Price" },
      E2: { t: "s", v: "Apple" },
      F2: { t: "n", v: 5 },
      G2: { t: "n", v: 100 },
      E3: { t: "s", v: "Banana" },
      F3: { t: "n", v: 3 },
      G3: { t: "n", v: 60 },
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    const { sheets } = convertWorkbook(wb);
    // Two separate table regions
    expect(sheets[0].regions).toHaveLength(2);
    expect(sheets[0].regions.every((r) => r.type === "table")).toBe(true);
    expect(sheets[0].markdown).toBe(
      `<table>
  <thead>
    <tr>
    <th>Name</th>
    <th style="text-align: right">Score</th>
    <th>Grade</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td>Alice</td>
    <td style="text-align: right">90</td>
    <td>A</td>
    </tr>
    <tr>
    <td>Bob</td>
    <td style="text-align: right">75</td>
    <td>B</td>
    </tr>
  </tbody>
</table>

<table>
  <thead>
    <tr>
    <th>Item</th>
    <th style="text-align: right">Qty</th>
    <th style="text-align: right">Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td>Apple</td>
    <td style="text-align: right">5</td>
    <td style="text-align: right">100</td>
    </tr>
    <tr>
    <td>Banana</td>
    <td style="text-align: right">3</td>
    <td style="text-align: right">60</td>
    </tr>
  </tbody>
</table>`,
    );
  });

  describe("issue 1: hidden rows and columns are excluded", () => {
    it("hidden rows are not included in region detection", () => {
      const wb = XLSX.utils.book_new();
      const ws: XLSX.WorkSheet = {
        "!ref": "A1:B3",
        A1: { t: "s", v: "H1" },
        B1: { t: "s", v: "H2" },
        A2: { t: "s", v: "secret" },
        B2: { t: "s", v: "data" },
        A3: { t: "s", v: "R3" },
        B3: { t: "s", v: "R3" },
        "!rows": [undefined, { hidden: true }] as XLSX.RowInfo[],
      };
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const { sheets } = convertWorkbook(wb);
      expect(sheets[0].markdown).toBe(
        `<table>
  <thead>
    <tr>
    <th>H1</th>
    <th>H2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td>R3</td>
    <td>R3</td>
    </tr>
  </tbody>
</table>`,
      );
    });

    it("hidden columns are not included in region detection", () => {
      const wb = XLSX.utils.book_new();
      const ws: XLSX.WorkSheet = {
        "!ref": "A1:C2",
        A1: { t: "s", v: "Visible" },
        B1: { t: "s", v: "Hidden" },
        C1: { t: "s", v: "Also visible" },
        A2: { t: "s", v: "v1" },
        B2: { t: "s", v: "h1" },
        C2: { t: "s", v: "v2" },
        "!cols": [undefined, { hidden: true }] as XLSX.ColInfo[],
      };
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const { sheets } = convertWorkbook(wb);
      expect(sheets[0].markdown).toBe("Visible\n\nv1\n\nAlso visible\n\nv2");
    });
  });

  describe("issue 6: horizontally merged cells count all spanned columns for density", () => {
    it("a master cell spanning 3 cols satisfies minColumns=2", () => {
      const wb = XLSX.utils.book_new();
      // Row 0: title merged across A:C (master A1, children B1 C1)
      // Rows 1-2: table data in A:C
      const ws: XLSX.WorkSheet = {
        "!ref": "A1:C3",
        A1: { t: "s", v: "Title spanning 3 cols" },
        A2: { t: "s", v: "r1c1" },
        B2: { t: "s", v: "r1c2" },
        C2: { t: "s", v: "r1c3" },
        A3: { t: "s", v: "r2c1" },
        B3: { t: "s", v: "r2c2" },
        C3: { t: "s", v: "r2c3" },
        "!merges": [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }],
      };
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const { sheets } = convertWorkbook(wb);
      expect(sheets[0].markdown).toBe(
        `<table>
  <thead>
    <tr>
    <th colspan="3">Title spanning 3 cols</th>
    </tr>
  </thead>
  <tbody>
    <tr>
    <td>r1c1</td>
    <td>r1c2</td>
    <td>r1c3</td>
    </tr>
    <tr>
    <td>r2c1</td>
    <td>r2c2</td>
    <td>r2c3</td>
    </tr>
  </tbody>
</table>`,
      );
    });
  });
});
