import * as XLSX from "xlsx";
import type { CellData, ResolvedOptions } from "./types.js";
import { extractCellData, escapeHtml } from "./cell-formatter.js";

interface MergeSpan {
  colspan: number;
  rowspan: number;
}

/**
 * Render a table region as an HTML table with full colspan/rowspan support.
 *
 * @param ws       - The worksheet
 * @param startRow - First row (0-based, inclusive)
 * @param endRow   - Last row (0-based, inclusive)
 * @param startCol - First column (0-based, inclusive)
 * @param endCol   - Last column (0-based, inclusive)
 * @param merges   - Merged cell ranges from ws['!merges']
 * @param opts     - Resolved options
 */
export function renderTable(
  ws: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  merges: XLSX.Range[],
  opts: ResolvedOptions,
): string {
  // Build merge maps for cells inside this table region
  const mergeSpanMap = new Map<string, MergeSpan>(); // master address → span
  const mergeChildSet = new Set<string>(); // child addresses to skip

  for (const m of merges) {
    // Only handle merges whose master cell is inside the table region
    if (m.s.r < startRow || m.s.r > endRow || m.s.c < startCol || m.s.c > endCol) continue;

    const masterAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });
    const colspan = m.e.c - m.s.c + 1;
    const rowspan = m.e.r - m.s.r + 1;
    mergeSpanMap.set(masterAddr, { colspan, rowspan });

    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue;
        mergeChildSet.add(XLSX.utils.encode_cell({ r, c }));
      }
    }
  }

  // Infer column alignments from data rows
  const alignments = inferColumnAlignments(
    ws,
    startRow,
    endRow,
    startCol,
    endCol,
    mergeChildSet,
    opts,
  );

  const lines: string[] = ["<table>"];

  // --- <thead> ---
  if (opts.headerRow) {
    lines.push("  <thead>");
    lines.push(
      renderHtmlRow(
        ws,
        startRow,
        startCol,
        endCol,
        mergeSpanMap,
        mergeChildSet,
        alignments,
        opts,
        "th",
      ),
    );
    lines.push("  </thead>");
  }

  // --- <tbody> ---
  lines.push("  <tbody>");
  const dataStartRow = opts.headerRow ? startRow + 1 : startRow;
  for (let r = dataStartRow; r <= endRow; r++) {
    lines.push(
      renderHtmlRow(ws, r, startCol, endCol, mergeSpanMap, mergeChildSet, alignments, opts, "td"),
    );
  }
  lines.push("  </tbody>");
  lines.push("</table>");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderHtmlRow(
  ws: XLSX.WorkSheet,
  row: number,
  startCol: number,
  endCol: number,
  mergeSpanMap: Map<string, MergeSpan>,
  mergeChildSet: Set<string>,
  alignments: ("left" | "center" | "right")[],
  opts: ResolvedOptions,
  tag: "th" | "td",
): string {
  const cells: string[] = [];

  for (let c = startCol; c <= endCol; c++) {
    const addr = XLSX.utils.encode_cell({ r: row, c });

    // Skip child cells of a merge
    if (mergeChildSet.has(addr)) continue;

    const cell: XLSX.CellObject | undefined = ws[addr];
    const data = extractCellData(cell, mergeChildSet, addr, opts);

    // Build attribute string
    const attrs: string[] = [];

    const span = mergeSpanMap.get(addr);
    if (span) {
      if (span.colspan > 1) attrs.push(`colspan="${span.colspan}"`);
      if (span.rowspan > 1) attrs.push(`rowspan="${span.rowspan}"`);
    }

    // Alignment: explicit cell alignment takes priority, then column-level inference
    const explicitAlign = data.alignment;
    const colAlign = alignments[c - startCol];
    const align = explicitAlign ?? colAlign;
    if (align && align !== "left") {
      attrs.push(`style="text-align: ${align}"`);
    }

    const attrStr = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
    const content = formatCellHtml(data, opts);
    cells.push(`    <${tag}${attrStr}>${content}</${tag}>`);
  }

  return `    <tr>\n${cells.join("\n")}\n    </tr>`;
}

/**
 * Format a cell's content as HTML.
 * Uses rawValue so that we apply HTML tags rather than Markdown syntax.
 */
function formatCellHtml(data: CellData, opts: ResolvedOptions): string {
  let val = escapeHtml(data.rawValue);
  // Newlines inside cells → <br>
  val = val.replace(/\n/g, "<br>");

  if (!val) return opts.emptyCell ? escapeHtml(opts.emptyCell) : "";
  if (!opts.richText) return val;

  // Apply HTML inline formatting
  if (data.bold && data.italic) val = `<strong><em>${val}</em></strong>`;
  else if (data.bold) val = `<strong>${val}</strong>`;
  else if (data.italic) val = `<em>${val}</em>`;

  if (data.hyperlink) val = `<a href="${escapeHtml(data.hyperlink)}">${val}</a>`;

  return val;
}

/**
 * Infer the best alignment for each column.
 * Priority: explicit cell alignment > all-numeric column content > left (default).
 */
function inferColumnAlignments(
  ws: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  mergeChildSet: Set<string>,
  opts: ResolvedOptions,
): ("left" | "center" | "right")[] {
  const dataStartRow = opts.headerRow ? startRow + 1 : startRow;
  const colCount = endCol - startCol + 1;
  const result: ("left" | "center" | "right")[] = [];

  for (let ci = 0; ci < colCount; ci++) {
    const c = startCol + ci;
    let explicit: "left" | "center" | "right" | undefined;
    let hasValue = false;
    let allNumeric = true;

    for (let r = dataStartRow; r <= endRow; r++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (mergeChildSet.has(addr)) continue;

      const cell: XLSX.CellObject | undefined = ws[addr];
      const data = extractCellData(cell, mergeChildSet, addr, opts);

      if (!explicit && data.alignment) explicit = data.alignment;

      const v = data.rawValue.trim();
      if (v) {
        hasValue = true;
        if (!/^-?[\d,]+(\.\d+)?%?$/.test(v)) allNumeric = false;
      }
    }

    if (explicit) {
      result.push(explicit);
    } else {
      result.push(hasValue && allNumeric ? "right" : "left");
    }
  }

  return result;
}
