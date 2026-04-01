import { describe, it, expect } from "vitest";
import { detectRegions } from "../region-detector.js";
import { resolveOptions } from "../options.js";
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
});
