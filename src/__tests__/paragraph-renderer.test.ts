import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { convertWorkbook } from "../index.js";
import { buildWorkbook, normalise } from "./helpers.js";

describe("paragraph rendering", () => {
  it("renders a single text cell as a paragraph", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [["Hello, world!"]],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(normalise(markdown)).toBe("Hello, world!");
  });

  it("renders multiple text rows as separate paragraphs", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [["First paragraph"], ["Second paragraph"]],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(normalise(markdown)).toBe("First paragraph\n\nSecond paragraph");
  });

  it("joins multiple cells in the same row with a space", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        // Two cells in row 0 — both sparse so treated as paragraph
        data: [["Hello", "World"]],
      },
    ]);
    const { markdown } = convertWorkbook(wb, { tableDetection: { minRows: 2, minColumns: 3 } });
    expect(normalise(markdown)).toBe("Hello World");
  });

  it("preserves newlines within a paragraph cell", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:A1",
      A1: { t: "s", v: "line1\nline2\nline3" },
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe("line1\nline2\nline3");
  });

  it("renders bold text in paragraph using markdown syntax", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:A1",
      A1: { t: "s", v: "important", s: { font: { bold: true } } } as XLSX.CellObject,
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb, { richText: true });
    expect(markdown).toBe("**important**");
  });

  it("renders italic text in paragraph using markdown syntax", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:A1",
      A1: { t: "s", v: "emphasis", s: { font: { italic: true } } } as XLSX.CellObject,
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb, { richText: true });
    expect(markdown).toBe("_emphasis_");
  });

  it("mixes text and table content in order", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["Introduction text"],
          [undefined],
          ["Name", "Score"],
          ["Alice", 95],
          ["Bob", 87],
          [undefined],
          ["Conclusion text"],
        ],
      },
    ]);
    const { sheets } = convertWorkbook(wb);
    const regions = sheets[0].regions;
    expect(regions[0].type).toBe("paragraph");
    expect(regions[1].type).toBe("table");
    expect(regions[2].type).toBe("paragraph");
  });
});
