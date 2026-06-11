import { afterEach, describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as XLSX from "xlsx";
import { convertXlsxToMarkdown, convertWorkbook } from "../index.js";
import { buildWorkbook } from "./helpers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBuffer(wb: XLSX.WorkBook): Buffer {
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ---------------------------------------------------------------------------
// convertXlsxToMarkdown — async file-I/O entry point
// ---------------------------------------------------------------------------

describe("convertXlsxToMarkdown", () => {
  const tempFiles: string[] = [];

  afterEach(() => {
    for (const p of tempFiles.splice(0)) {
      try {
        fs.unlinkSync(p);
      } catch {
        // ignore cleanup errors
      }
    }
  });

  function writeTempFile(wb: XLSX.WorkBook): string {
    const buf = toBuffer(wb);
    const p = path.join(os.tmpdir(), `xlsx-to-md-test-${Date.now()}.xlsx`);
    fs.writeFileSync(p, buf);
    tempFiles.push(p);
    return p;
  }

  it("reads an XLSX file given as a file-system path", async () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["Name", "Age"],
          ["Alice", 30],
        ],
      },
    ]);
    const p = writeTempFile(wb);
    const { markdown, sheets } = await convertXlsxToMarkdown(p);
    expect(sheets[0].name).toBe("Sheet1");
    expect(markdown).toContain("<table>");
    expect(markdown).toContain("Alice");
  });

  it("accepts a pre-read Buffer", async () => {
    const wb = buildWorkbook([
      {
        name: "Data",
        data: [
          ["X", "Y"],
          [1, 2],
        ],
      },
    ]);
    const buf = toBuffer(wb);
    const { sheets, markdown } = await convertXlsxToMarkdown(buf);
    expect(sheets[0].name).toBe("Data");
    expect(markdown).toContain("<table>");
  });

  it("accepts a Uint8Array", async () => {
    const wb = buildWorkbook([
      {
        name: "Data",
        data: [
          ["X", "Y"],
          [1, 2],
        ],
      },
    ]);
    const buf = toBuffer(wb);
    const uint8 = new Uint8Array(buf);
    const { markdown } = await convertXlsxToMarkdown(uint8);
    expect(markdown).toContain("<table>");
  });

  it("forwards options to the converter when given a file path", async () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["A", "B"],
          [1, 2],
        ],
      },
    ]);
    const p = writeTempFile(wb);
    const { markdown } = await convertXlsxToMarkdown(p, { headerRow: false });
    // headerRow: false means no <th> elements — all rows become <td>
    expect(markdown).not.toContain("<th>");
    expect(markdown).toContain("<td>A</td>");
  });

  it("forwards options to the converter when given a Buffer", async () => {
    const wb = buildWorkbook([
      {
        name: "Alpha",
        data: [
          ["a", "b"],
          [1, 2],
        ],
      },
      {
        name: "Beta",
        data: [
          ["x", "y"],
          [3, 4],
        ],
      },
    ]);
    const buf = toBuffer(wb);
    const { sheets } = await convertXlsxToMarkdown(buf, { sheets: ["Beta"] });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].name).toBe("Beta");
  });
});

// ---------------------------------------------------------------------------
// convertWorkbook — error / edge-case handling
// ---------------------------------------------------------------------------

describe("convertWorkbook error and edge-case handling", () => {
  it("throws when a numeric sheet filter index is out of range", () => {
    const wb = buildWorkbook([{ name: "Sheet1", data: [["A"]] }]);
    expect(() => convertWorkbook(wb, { sheets: [99] })).toThrow("Sheet index 99 is out of range");
  });

  it("returns empty markdown and zero sheets for a workbook with no sheets", () => {
    const wb = XLSX.utils.book_new();
    const { markdown, sheets } = convertWorkbook(wb);
    expect(markdown).toBe("");
    expect(sheets).toHaveLength(0);
  });

  it("returns empty markdown for a worksheet that has no !ref (empty sheet)", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {}; // deliberately omit !ref
    XLSX.utils.book_append_sheet(wb, ws, "Empty");
    const { markdown, sheets } = convertWorkbook(wb);
    expect(markdown).toBe("");
    expect(sheets[0].markdown).toBe("");
    expect(sheets[0].regions).toHaveLength(0);
  });
});
