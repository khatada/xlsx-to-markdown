import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { detectRegions } from "../region-detector.js";
import { resolveOptions } from "../options.js";
import { convertWorkbook } from "../index.js";
import type { RowInfo } from "../types.js";

function makeRowInfo(index: number, cols: number[], hasBorder = false): RowInfo {
  const filledCols = new Set(cols);
  const minCol = cols.length ? Math.min(...cols) : -1;
  const maxCol = cols.length ? Math.max(...cols) : -1;
  return { index, filledCols, minCol, maxCol, filledCount: cols.length, hasBorder };
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

    it("dense rows before first bordered row become a paragraph", () => {
      // Row 0: title row — 3 filled cols, no border → should be paragraph
      // Rows 1-2: table rows — bordered
      const rows = [
        makeRowInfo(0, [0, 1, 2], false), // dense but no border
        makeRowInfo(1, [0, 1, 2], true), // table header (bordered)
        makeRowInfo(2, [0, 1, 2], true), // table data (bordered)
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

    it("multiple leading non-bordered rows all become a single paragraph region", () => {
      const rows = [
        makeRowInfo(0, [0, 1], false),
        makeRowInfo(1, [0, 1], false),
        makeRowInfo(2, [0, 1], true),
        makeRowInfo(3, [0, 1], true),
      ];
      const regions = detectRegions(rows, borderOpts);
      expect(regions).toHaveLength(2);
      expect(regions[0].type).toBe("paragraph");
      expect(regions[0].startRow).toBe(0);
      expect(regions[0].endRow).toBe(1);
      expect(regions[1].type).toBe("table");
      expect(regions[1].startRow).toBe(2);
    });

    it("falls back to density when no row has borders", () => {
      // All rows without borders → density-based classification as before
      const rows = [
        makeRowInfo(0, [0], false), // sparse → paragraph
        makeRowInfo(1, [0, 1], false), // dense
        makeRowInfo(2, [0, 1], false), // dense → table (minRows satisfied)
      ];
      const regions = detectRegions(rows, borderOpts);
      expect(regions[0].type).toBe("paragraph");
      expect(regions[1].type).toBe("table");
    });

    it("when useBorders is false, leading dense rows are classified as table", () => {
      const noBorderOpts = resolveOptions({ tableDetection: { useBorders: false } });
      const rows = [
        makeRowInfo(0, [0, 1, 2], false),
        makeRowInfo(1, [0, 1, 2], true),
        makeRowInfo(2, [0, 1, 2], true),
      ];
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
    // Two <table> elements in the output
    expect(sheets[0].markdown.match(/<table>/g)?.length).toBe(2);
    // Each table's headers are present
    expect(sheets[0].markdown).toContain("Name");
    expect(sheets[0].markdown).toContain("Item");
  });
});
