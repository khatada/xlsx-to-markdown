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
 * Unescape XML character entities.
 */
function unescapeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Parse XLSX rich-text XML (cell.r) into an array of styled text runs.
 * Returns null when the input is not rich-text XML or contains no runs.
 *
 * Expected XML format (OOXML shared-string rich text):
 *   <r><rPr><b/></rPr><t xml:space="preserve">bold </t></r><r><t>normal</t></r>
 */
function parseRichTextRuns(xml: string): { text: string; bold: boolean; italic: boolean }[] | null {
  if (!xml.includes("<r>") && !xml.includes("<r ")) return null;

  const runs: { text: string; bold: boolean; italic: boolean }[] = [];
  const rPattern = /<r>([\s\S]*?)<\/r>/g;
  let m: RegExpExecArray | null;
  while ((m = rPattern.exec(xml)) !== null) {
    const inner = m[1];
    const rPr = (/<rPr>([\s\S]*?)<\/rPr>/.exec(inner) ?? [])[1] ?? "";
    const bold = /<b\b[^>]*\/?>/.test(rPr);
    const italic = /<i\b[^>]*\/?>/.test(rPr);
    const tMatch = /<t[^>]*>([\s\S]*?)<\/t>/.exec(inner);
    if (tMatch) {
      runs.push({ text: unescapeXml(tMatch[1]), bold, italic });
    }
  }
  return runs.length > 0 ? runs : null;
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

  // --- Extract style-independent fields up front ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const style: any = (cell as any).s;

  // Hyperlinks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links: any = (cell as any).l;
  let hyperlink: string | undefined;
  if (links?.Target) {
    hyperlink = links.Target;
  }
  // Issue 4: =HYPERLINK("url", ...) formula — cell.l is absent for formula-based links
  if (!hyperlink && cell.f) {
    const match = cell.f.match(/^HYPERLINK\s*\(\s*"([^"]+)"/i);
    if (match) hyperlink = match[1];
  }

  // Border detection
  let hasBorder = false;
  if (style?.border) {
    const b = style.border;
    hasBorder = !!(b.top?.style || b.bottom?.style || b.left?.style || b.right?.style);
  }

  // Alignment
  let alignment: CellData["alignment"];
  if (style?.alignment?.horizontal) {
    const h = style.alignment.horizontal;
    if (h === "center" || h === "right") alignment = h;
    else alignment = "left";
  }

  // --- Inline rich text: parse cell.r XML (ADR-0019) ---
  if (opts.richText && cell.r) {
    const runs = parseRichTextRuns(String(cell.r));
    if (runs) {
      const nl = (s: string) => s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      const rawText = nl(runs.map((r) => r.text).join(""));

      // Move leading/trailing whitespace outside bold/italic markers so that
      // CommonMark right-flanking delimiter rules are satisfied:
      // "**bold** " instead of "**bold **" (trailing space inside breaks rendering).
      let markdownText = runs
        .map((r) => {
          const text = nl(r.text);
          if (!r.bold && !r.italic) return text;
          const lead = /^\s*/.exec(text)![0];
          const trail = /\s*$/.exec(text)![0];
          const core = text.slice(lead.length, text.length - trail.length);
          return core ? lead + applyInlineFormatting(core, r.bold, r.italic) + trail : text;
        })
        .join("");
      if (hyperlink) markdownText = `[${markdownText}](${hyperlink})`;

      const richTextHtml = runs
        .map((r) => {
          let t = escapeHtml(nl(r.text)).replace(/\n/g, "<br>");
          if (r.bold && r.italic) t = `<strong><em>${t}</em></strong>`;
          else if (r.bold) t = `<strong>${t}</strong>`;
          else if (r.italic) t = `<em>${t}</em>`;
          return t;
        })
        .join("");

      return {
        rawValue: rawText,
        value: markdownText,
        bold: false,
        italic: false,
        hyperlink,
        alignment,
        isMergedChild,
        hasBorder,
        richTextHtml,
      };
    }
  }

  // --- Fallback: plain value extraction ---
  let value = "";
  if (cell.t === "d") {
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

  // Cell-level style (bold/italic applied to whole cell)
  let bold = false;
  let italic = false;
  if (opts.richText && style) {
    bold = !!style.font?.bold;
    italic = !!style.font?.italic;
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
