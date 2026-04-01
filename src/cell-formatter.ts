import * as XLSX from "xlsx";
import type { CellData, ResolvedOptions } from "./types.js";

/**
 * Format a date serial number (Excel date) to a string using a simple format.
 * Tokens: YYYY, MM, DD, HH, mm, ss
 */
function formatDate(dateSerial: number, fmt: string): string {
  // Excel date serial: days since 1899-12-30 (accounting for the Lotus 1-2-3 bug)
  const date = XLSX.SSF.parse_date_code(dateSerial);
  if (!date) return String(dateSerial);
  const pad = (n: number) => String(n).padStart(2, "0");
  return fmt
    .replace("YYYY", String(date.y))
    .replace("MM", pad(date.m))
    .replace("DD", pad(date.d))
    .replace("HH", pad(date.H))
    .replace("mm", pad(date.M))
    .replace("ss", pad(date.S));
}

/**
 * Apply rich-text inline markdown (bold/italic) to a string.
 */
function applyInlineFormatting(text: string, bold: boolean, italic: boolean): string {
  if (!text) return text;
  if (bold && italic) return `***${text}***`;
  if (bold) return `**${text}**`;
  if (italic) return `_${text}_`;
  return text;
}

/**
 * Escape pipe and backslash characters inside a GFM table cell value.
 * @deprecated Not used in HTML table rendering; kept for potential external use.
 */
export function escapeTableCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

/**
 * Escape HTML special characters for safe embedding in HTML attributes and text.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Extract a CellData object from an xlsx cell.
 */
export function extractCellData(
  cell: XLSX.CellObject | undefined,
  mergedChildCells: Set<string>,
  cellAddress: string,
  opts: ResolvedOptions,
): CellData {
  const isMergedChild = mergedChildCells.has(cellAddress);

  if (!cell || cell.v === undefined || cell.v === null) {
    return {
      rawValue: "",
      value: "",
      bold: false,
      italic: false,
      isMergedChild,
      hasBorder: false,
    };
  }

  let value = "";
  let bold = false;
  let italic = false;
  let hyperlink: string | undefined;

  // --- Extract rich text or plain value ---
  if (opts.richText && cell.r) {
    // Rich text: cell.r is an XML string, but SheetJS parses it into cell.v (plain)
    // For proper rich text we'd need to parse cell.r XML; for now use plain value
    // and check font from cell.s if available
    value = cell.w ?? String(cell.v);
  } else if (cell.t === "d") {
    // Date
    const raw = typeof cell.v === "number" ? cell.v : Number(cell.v);
    value = formatDate(raw, opts.dateFormat);
  } else if (cell.t === "n") {
    // Number: use formatted value if available, otherwise toString
    value = cell.w ?? String(cell.v);
  } else if (cell.t === "b") {
    value = cell.v ? "TRUE" : "FALSE";
  } else {
    value = cell.w ?? String(cell.v);
  }

  // Normalize newlines within cells (for table rendering, replace with <br>)
  value = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // --- Extract formatting from cell style ---
  // SheetJS only populates .s when styles are available (XLSX format, not CSV etc.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const style: any = (cell as any).s;
  if (opts.richText && style) {
    bold = !!style.font?.bold;
    italic = !!style.font?.italic;
  }

  // --- Hyperlinks ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links: any = (cell as any).l;
  if (links?.Target) {
    hyperlink = links.Target;
  }

  // --- Border detection ---
  let hasBorder = false;
  if (style?.border) {
    const b = style.border;
    hasBorder = !!(b.top?.style || b.bottom?.style || b.left?.style || b.right?.style);
  }

  // --- Alignment ---
  let alignment: CellData["alignment"];
  if (style?.alignment?.horizontal) {
    const h = style.alignment.horizontal;
    if (h === "center" || h === "right") alignment = h;
    else alignment = "left";
  }

  const formatted = opts.richText ? applyInlineFormatting(value, bold, italic) : value;
  const final = hyperlink ? `[${formatted}](${hyperlink})` : formatted;

  return {
    rawValue: value,
    value: final,
    bold,
    italic,
    hyperlink,
    alignment,
    isMergedChild,
    hasBorder,
  };
}
