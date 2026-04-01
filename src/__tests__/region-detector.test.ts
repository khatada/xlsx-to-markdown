import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { detectRegions } from "../region-detector.js";
import { resolveOptions } from "../options.js";
import { convertWorkbook } from "../index.js";
import type { RowInfo } from "../types.js";

function makeRowInfo(index: number, cols: number[]): RowInfo {
  const filledCols = new Set(cols);
  const minCol = cols.length ? Math.min(...cols) : -1;
  const maxCol = cols.length ? Math.max(...cols) : -1;
  return { index, filledCols, minCol, maxCol, filledCount: cols.length };
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

  it("side-by-side tables (same rows, non-overlapping columns) are merged into one region", () => {
    // Table A: cols 0-2, Table B: cols 4-6 — column 3 is empty
    // The row-density scan sees filledCount=6 per row and treats the whole
    // row span as one dense block → produces a single wide table region.
    const rows = [
      makeRowInfo(0, [0, 1, 2, 4, 5, 6]),
      makeRowInfo(1, [0, 1, 2, 4, 5, 6]),
      makeRowInfo(2, [0, 1, 2, 4, 5, 6]),
    ];
    const regions = detectRegions(rows, opts);
    expect(regions).toHaveLength(1);
    expect(regions[0].type).toBe("table");
    // Region spans from col 0 to col 6
    expect(regions[0].startCol).toBe(0);
    expect(regions[0].endCol).toBe(6);
  });

  it("side-by-side tables are rendered as one HTML table with an empty separator column", () => {
    // Integration test: verify the actual HTML output for horizontal tables.
    // Column 3 (D) is empty and appears as empty <td> cells between the two logical tables.
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:G3",
      // Table A header
      A1: { t: "s", v: "Name" },
      B1: { t: "s", v: "Score" },
      C1: { t: "s", v: "Grade" },
      // Table B header (col E=4, F=5, G=6)
      E1: { t: "s", v: "Item" },
      F1: { t: "s", v: "Qty" },
      G1: { t: "s", v: "Price" },
      // Table A data
      A2: { t: "s", v: "Alice" },
      B2: { t: "n", v: 90 },
      C2: { t: "s", v: "A" },
      // Table B data
      E2: { t: "s", v: "Apple" },
      F2: { t: "n", v: 5 },
      G2: { t: "n", v: 100 },
      // Table A data row 2
      A3: { t: "s", v: "Bob" },
      B3: { t: "n", v: 75 },
      C3: { t: "s", v: "B" },
      // Table B data row 2
      E3: { t: "s", v: "Banana" },
      F3: { t: "n", v: 3 },
      G3: { t: "n", v: 60 },
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    const { sheets } = convertWorkbook(wb);
    // Detected as a single table (not two separate tables)
    expect(sheets[0].regions).toHaveLength(1);
    expect(sheets[0].regions[0].type).toBe("table");
    // Rendered as one <table> element
    expect(sheets[0].markdown.match(/<table>/g)?.length).toBe(1);
    // Both table A and table B headers appear
    expect(sheets[0].markdown).toContain("Name");
    expect(sheets[0].markdown).toContain("Item");
  });
});
