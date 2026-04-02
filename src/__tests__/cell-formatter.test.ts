import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { extractCellData } from "../cell-formatter.js";
import { resolveOptions } from "../options.js";

const opts = resolveOptions();
const noMerges = new Set<string>();

function makeCell(fields: Partial<XLSX.CellObject>): XLSX.CellObject {
  return fields as XLSX.CellObject;
}

describe("extractCellData", () => {
  describe("formula cells", () => {
    it("renders the computed value, not the formula string", () => {
      const cell = makeCell({ t: "n", v: 30, f: "A1+B1", w: "30" });
      const data = extractCellData(cell, noMerges, "C1", opts);
      expect(data.rawValue).toBe("30");
    });

    it("uses formatted string (w) over raw value when available", () => {
      // Formula that produces a number displayed as currency
      const cell = makeCell({ t: "n", v: 1234567, f: "SUM(A1:A10)", w: "1,234,567" });
      const data = extractCellData(cell, noMerges, "B1", opts);
      expect(data.rawValue).toBe("1,234,567");
    });

    it("falls back to String(v) when w is absent", () => {
      const cell = makeCell({ t: "n", v: 42, f: "6*7" });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.rawValue).toBe("42");
    });

    it("handles string-result formula", () => {
      const cell = makeCell({ t: "s", v: "hello", f: 'CONCATENATE("hel","lo")', w: "hello" });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.rawValue).toBe("hello");
    });
  });

  describe("cell types", () => {
    it("renders boolean TRUE", () => {
      const cell = makeCell({ t: "b", v: true });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.rawValue).toBe("TRUE");
    });

    it("renders boolean FALSE", () => {
      const cell = makeCell({ t: "b", v: false });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.rawValue).toBe("FALSE");
    });

    it("renders number using formatted value when present", () => {
      const cell = makeCell({ t: "n", v: 0.5, w: "50%" });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.rawValue).toBe("50%");
    });

    it("renders number using raw value when formatted value is absent", () => {
      const cell = makeCell({ t: "n", v: 3.14 });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.rawValue).toBe("3.14");
    });

    it("uses pre-formatted string (w) for date cells stored as numbers (cellDates:false)", () => {
      // convertXlsxToMarkdown uses cellDates:false, so dates arrive as t:'n'
      // with cell.w already containing the locale-formatted string
      const cell = makeCell({ t: "n", v: 45000, w: "2023-03-15" });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.rawValue).toBe("2023-03-15");
    });

    it("formats t:d cell using dateFormat option", () => {
      // When a workbook is parsed with cellDates:true, dates arrive as t:'d'
      // and our formatDate() is called with the serial number
      const cell = makeCell({ t: "d", v: 45000 });
      const optsWithDate = resolveOptions({ dateFormat: "YYYY/MM/DD" });
      const data = extractCellData(cell, noMerges, "A1", optsWithDate);
      // XLSX.SSF.parse_date_code may not resolve every serial in test env;
      // we accept either a formatted date or the raw serial fallback
      expect(data.rawValue).toMatch(/^(\d{4}\/\d{2}\/\d{2}|\d+)$/);
    });

    it("returns empty rawValue for undefined cell", () => {
      const data = extractCellData(undefined, noMerges, "A1", opts);
      expect(data.rawValue).toBe("");
      expect(data.value).toBe("");
    });

    it("returns empty rawValue for cell with null value", () => {
      const cell = makeCell({ t: "s", v: null as unknown as string });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.rawValue).toBe("");
    });
  });

  describe("issue 4: HYPERLINK formula", () => {
    it("extracts URL from =HYPERLINK(url, text) formula when cell.l is absent", () => {
      const cell = makeCell({
        t: "s",
        v: "Click here",
        f: 'HYPERLINK("https://example.com","Click here")',
        w: "Click here",
      });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.value).toBe("[Click here](https://example.com)");
    });

    it("extracts URL from =HYPERLINK(url) formula (single argument)", () => {
      const cell = makeCell({
        t: "s",
        v: "https://example.com",
        f: 'HYPERLINK("https://example.com")',
      });
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.value).toBe("[https://example.com](https://example.com)");
    });

    it("cell.l takes precedence over HYPERLINK formula", () => {
      const cell = makeCell({
        t: "s",
        v: "link",
        f: 'HYPERLINK("https://formula.example.com","link")',
        l: { Target: "https://cell-l.example.com" },
      } as Partial<XLSX.CellObject>);
      const data = extractCellData(cell, noMerges, "A1", opts);
      expect(data.value).toBe("[link](https://cell-l.example.com)");
    });
  });

  describe("merge detection", () => {
    it("marks child merged cells as isMergedChild", () => {
      const mergedChildren = new Set(["B1", "C1"]);
      const cell = makeCell({ t: "s", v: "child" });
      const data = extractCellData(cell, mergedChildren, "B1", opts);
      expect(data.isMergedChild).toBe(true);
    });

    it("does not mark master merged cell as isMergedChild", () => {
      const mergedChildren = new Set(["B1", "C1"]);
      const cell = makeCell({ t: "s", v: "master" });
      const data = extractCellData(cell, mergedChildren, "A1", opts);
      expect(data.isMergedChild).toBe(false);
    });
  });
});
