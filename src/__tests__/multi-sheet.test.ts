import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { convertWorkbook } from "../index.js";
import { buildWorkbook } from "./helpers.js";

const TABLE_AB = `<table>
    <tr>
    <th style="text-align: right">a</th>
    <th style="text-align: right">b</th>
    </tr>
    <tr>
    <td style="text-align: right">1</td>
    <td style="text-align: right">2</td>
    </tr>
</table>`;

const TABLE_XY = `<table>
    <tr>
    <th style="text-align: right">x</th>
    <th style="text-align: right">y</th>
    </tr>
    <tr>
    <td style="text-align: right">3</td>
    <td style="text-align: right">4</td>
    </tr>
</table>`;

describe("multi-sheet handling", () => {
  it("adds ## headings when there are multiple sheets", () => {
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
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(`## Alpha\n\n${TABLE_AB}\n\n\n## Beta\n\n${TABLE_XY}`);
  });

  it("does NOT add headings for a single sheet", () => {
    const wb = buildWorkbook([
      {
        name: "Only",
        data: [
          ["a", "b"],
          [1, 2],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toBe(TABLE_AB);
  });

  it("respects the sheetHeadings: false option", () => {
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
    const { markdown } = convertWorkbook(wb, { sheetHeadings: false });
    expect(markdown).toBe(`${TABLE_AB}\n\n\n${TABLE_XY}`);
  });

  it("filters sheets by name", () => {
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
      {
        name: "Gamma",
        data: [
          ["p", "q"],
          [5, 6],
        ],
      },
    ]);
    const { sheets } = convertWorkbook(wb, { sheets: ["Alpha", "Gamma"] });
    expect(sheets.map((s) => s.name)).toEqual(["Alpha", "Gamma"]);
  });

  it("throws when filtering by non-existent sheet name", () => {
    const wb = buildWorkbook([
      {
        name: "Alpha",
        data: [
          ["a", "b"],
          [1, 2],
        ],
      },
    ]);
    expect(() => convertWorkbook(wb, { sheets: ["NonExistent"] })).toThrow(
      'Sheet "NonExistent" not found',
    );
  });

  it("escapes Markdown special characters in sheet name headings", () => {
    // Excel forbids * [ ] \ / ? : in sheet names, but _ ` < > ! are allowed.
    // We test with _ and ` which are Markdown inline formatting characters.
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([
      ["a", "b"],
      [1, 2],
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["x", "y"],
      [3, 4],
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, "_italic_"); // underscores → italic in Markdown
    XLSX.utils.book_append_sheet(wb, ws2, "code`snippet"); // backtick → code in Markdown
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("## \\_italic\\_");
    expect(markdown).toContain("## code\\`snippet");
  });

  it("skips hidden sheets by default", () => {
    const wb = buildWorkbook([
      {
        name: "Visible",
        data: [
          ["a", "b"],
          [1, 2],
        ],
      },
      {
        name: "Hidden",
        data: [
          ["x", "y"],
          [3, 4],
        ],
      },
    ]);
    // Mark second sheet as hidden via workbook metadata
    wb.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 1 }] };
    const { sheets } = convertWorkbook(wb);
    expect(sheets.map((s) => s.name)).toEqual(["Visible"]);
  });

  it("includes hidden sheets when explicitly requested via sheets option", () => {
    const wb = buildWorkbook([
      {
        name: "Visible",
        data: [
          ["a", "b"],
          [1, 2],
        ],
      },
      {
        name: "Hidden",
        data: [
          ["x", "y"],
          [3, 4],
        ],
      },
    ]);
    wb.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 1 }] };
    // Explicit filter bypasses visibility check
    const { sheets } = convertWorkbook(wb, { sheets: ["Hidden"] });
    expect(sheets.map((s) => s.name)).toEqual(["Hidden"]);
  });

  it("filters sheets by index", () => {
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
    const { sheets } = convertWorkbook(wb, { sheets: [0] });
    expect(sheets.map((s) => s.name)).toEqual(["Alpha"]);
  });
});
