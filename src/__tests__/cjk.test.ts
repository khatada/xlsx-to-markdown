/**
 * CJK (Chinese / Japanese / Korean) content tests.
 *
 * Verifies that multi-byte CJK characters are:
 *   - passed through HTML rendering unescaped
 *   - detected correctly as non-numeric (no right-alignment applied)
 *   - handled in paragraphs, table headers/cells, sheet names, rich-text, and hyperlinks
 */

import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { convertWorkbook } from "../index.js";
import { extractCellData, escapeHtml } from "../cell-formatter.js";
import { resolveOptions } from "../options.js";
import { buildWorkbook } from "./helpers.js";

const opts = resolveOptions();
const noMerges = new Set<string>();

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe("escapeHtml with CJK characters", () => {
  it("passes CJK characters through unchanged", () => {
    expect(escapeHtml("日本語")).toBe("日本語");
    expect(escapeHtml("中文")).toBe("中文");
    expect(escapeHtml("한국어")).toBe("한국어");
  });

  it("escapes HTML special chars embedded in CJK text", () => {
    expect(escapeHtml("価格 < 100 & 税込")).toBe("価格 &lt; 100 &amp; 税込");
    expect(escapeHtml("<日本語>")).toBe("&lt;日本語&gt;");
  });
});

// ---------------------------------------------------------------------------
// extractCellData
// ---------------------------------------------------------------------------

describe("extractCellData with CJK content", () => {
  it("returns CJK string value unchanged", () => {
    const cell: XLSX.CellObject = { t: "s", v: "商品名" };
    const data = extractCellData(cell, noMerges, "A1", opts);
    expect(data.rawValue).toBe("商品名");
    expect(data.value).toBe("商品名");
  });

  it("applies bold markdown to CJK text when richText is enabled", () => {
    const richOpts = resolveOptions({ richText: true });
    const cell = { t: "s", v: "重要", s: { font: { bold: true } } } as XLSX.CellObject;
    const data = extractCellData(cell, noMerges, "A1", richOpts);
    expect(data.value).toBe("**重要**");
  });

  it("applies italic markdown to CJK text when richText is enabled", () => {
    const richOpts = resolveOptions({ richText: true });
    const cell = { t: "s", v: "説明", s: { font: { italic: true } } } as XLSX.CellObject;
    const data = extractCellData(cell, noMerges, "A1", richOpts);
    expect(data.value).toBe("_説明_");
  });

  it("wraps CJK text in hyperlink markdown", () => {
    const cell = {
      t: "s",
      v: "クリックしてください",
      l: { Target: "https://example.com" },
    } as XLSX.CellObject;
    const data = extractCellData(cell, noMerges, "A1", opts);
    expect(data.value).toBe("[クリックしてください](https://example.com)");
  });

  it("extracts CJK URL label from HYPERLINK formula", () => {
    const cell: XLSX.CellObject = {
      t: "s",
      v: "詳細はこちら",
      f: 'HYPERLINK("https://example.jp","詳細はこちら")',
    };
    const data = extractCellData(cell, noMerges, "A1", opts);
    expect(data.value).toBe("[詳細はこちら](https://example.jp)");
  });
});

// ---------------------------------------------------------------------------
// Table rendering (HTML)
// ---------------------------------------------------------------------------

describe("table rendering with CJK content", () => {
  it("renders CJK header and data cells without corruption", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["氏名", "年齢", "部署"],
          ["田中 太郎", 30, "営業部"],
          ["李 小龍", 25, "開発部"],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("<th>氏名</th>");
    // 年齢は数値列なので right-align スタイルが付く
    expect(markdown).toMatch(/年齢/);
    expect(markdown).toContain("<th>部署</th>");
    expect(markdown).toContain("<td>田中 太郎</td>");
    expect(markdown).toContain("<td>李 小龍</td>");
    expect(markdown).toContain("<td>営業部</td>");
  });

  it("does not right-align CJK text columns (only numeric columns get right-align)", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["商品", "カテゴリ"],
          ["りんご", "果物"],
          ["にんじん", "野菜"],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    // CJK text → no right-align style
    expect(markdown).not.toContain('style="text-align: right"');
  });

  it("escapes HTML special characters mixed into CJK content", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["説明", "値"],
          ["価格 < 100", "A & B"],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("価格 &lt; 100");
    expect(markdown).toContain("A &amp; B");
  });

  it("handles Korean characters in headers and cells", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["이름", "나이"],
          ["김철수", 28],
          ["이영희", 32],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("<th>이름</th>");
    expect(markdown).toContain("<td>김철수</td>");
  });

  it("handles Simplified Chinese characters in headers and cells", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["姓名", "年龄", "城市"],
          ["张伟", 35, "北京"],
          ["王芳", 28, "上海"],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("<th>姓名</th>");
    expect(markdown).toContain("<td>张伟</td>");
    expect(markdown).toContain("<td>北京</td>");
  });

  it("renders CJK text in cells with newlines using <br>", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B2",
      A1: { t: "s", v: "項目" },
      B1: { t: "s", v: "説明" },
      A2: { t: "s", v: "商品名" },
      B2: { t: "s", v: "高品質\n低価格" },
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("高品質<br>低価格");
  });

  it("renders CJK rich text with bold HTML tags", () => {
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      "!ref": "A1:B2",
      A1: { t: "s", v: "Name" },
      B1: { t: "s", v: "Note" },
      A2: { t: "s", v: "田中" },
      B2: { t: "s", v: "重要", s: { font: { bold: true } } } as XLSX.CellObject,
    };
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const { markdown } = convertWorkbook(wb, { richText: true });
    expect(markdown).toContain("<strong>重要</strong>");
  });

  it("right-aligns numeric column even when header is CJK", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [
          ["商品", "価格"],
          ["りんご", 150],
          ["みかん", 100],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    // 価格 column is all numeric → right-aligned
    expect(markdown).toContain('style="text-align: right"');
  });
});

// ---------------------------------------------------------------------------
// Paragraph rendering
// ---------------------------------------------------------------------------

describe("paragraph rendering with CJK content", () => {
  it("renders a CJK sentence as a paragraph", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [["これはテストです。"]],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("これはテストです。");
  });

  it("renders multiple CJK rows as separate paragraphs", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [["概要"], ["詳細説明"]],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("概要");
    expect(markdown).toContain("詳細説明");
  });

  it("joins multiple CJK cells in the same row with a space", () => {
    const wb = buildWorkbook([
      {
        name: "Sheet1",
        data: [["タイトル", "サブタイトル"]],
      },
    ]);
    const { markdown } = convertWorkbook(wb, { tableDetection: { minRows: 2, minColumns: 3 } });
    expect(markdown).toContain("タイトル サブタイトル");
  });
});

// ---------------------------------------------------------------------------
// Multi-sheet with CJK sheet names
// ---------------------------------------------------------------------------

describe("multi-sheet with CJK sheet names", () => {
  it("renders CJK sheet name as ## heading", () => {
    const wb = buildWorkbook([
      {
        name: "売上データ",
        data: [
          ["月", "金額"],
          ["1月", 100000],
        ],
      },
      {
        name: "仕入データ",
        data: [
          ["月", "金額"],
          ["1月", 80000],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("## 売上データ");
    expect(markdown).toContain("## 仕入データ");
  });

  it("renders mixed ASCII and CJK sheet names", () => {
    const wb = buildWorkbook([
      {
        name: "Summary",
        data: [
          ["a", "b"],
          [1, 2],
        ],
      },
      {
        name: "詳細",
        data: [
          ["x", "y"],
          [3, 4],
        ],
      },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("## 詳細");
  });
});
