import * as fs from "fs";
import * as XLSX from "xlsx";
import type { ConvertOptions, ConvertResult } from "./types.js";
import { resolveOptions } from "./options.js";
import { convertSheet } from "./sheet-converter.js";

export type { ConvertOptions, ConvertResult, SheetResult, Region, RegionType } from "./types.js";

/**
 * Convert an XLSX file (given as a file path or a Buffer/Uint8Array) to Markdown.
 *
 * @example
 * ```ts
 * import { convertXlsxToMarkdown } from 'xlsx-to-md';
 *
 * const result = await convertXlsxToMarkdown('report.xlsx');
 * console.log(result.markdown);
 * ```
 */
export async function convertXlsxToMarkdown(
  input: string | Buffer | Uint8Array,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const opts = resolveOptions(options);

  let workbook: XLSX.WorkBook;
  if (typeof input === "string") {
    const buffer = await fs.promises.readFile(input);
    workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true, cellDates: false });
  } else {
    workbook = XLSX.read(input, { type: "buffer", cellStyles: true, cellDates: false });
  }

  return _convert(workbook, opts);
}

/**
 * Convert an already-parsed XLSX.WorkBook to Markdown.
 * Useful when you have already read the workbook using SheetJS.
 */
export function convertWorkbook(
  workbook: XLSX.WorkBook,
  options: ConvertOptions = {},
): ConvertResult {
  const opts = resolveOptions(options);
  return _convert(workbook, opts);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Escape Markdown inline special characters in a sheet name used as a heading.
 * Prevents characters like *, _, `, [, ] from being interpreted as Markdown syntax.
 */
function escapeMarkdownHeading(name: string): string {
  return name.replace(/[\\*_`[\]<>!]/g, "\\$&");
}

function _convert(workbook: XLSX.WorkBook, opts: ReturnType<typeof resolveOptions>): ConvertResult {
  const allSheetNames = workbook.SheetNames;

  // Filter sheets
  let sheetNames: string[];
  if (opts.sheets && opts.sheets.length > 0) {
    // When an explicit filter is given, honour it regardless of sheet visibility.
    sheetNames = opts.sheets.map((s) => {
      if (typeof s === "number") {
        const name = allSheetNames[s];
        if (!name) throw new Error(`Sheet index ${s} is out of range`);
        return name;
      }
      if (!allSheetNames.includes(s)) throw new Error(`Sheet "${s}" not found`);
      return s;
    });
  } else {
    // Default: process only visible sheets (ADR-0021).
    sheetNames = allSheetNames.filter((_, i) => {
      const meta = workbook.Workbook?.Sheets?.[i];
      return !meta?.Hidden; // Hidden=0 visible, Hidden=1 hidden, Hidden=2 very hidden
    });
  }

  // Resolve heading behaviour
  const addSheetHeadings =
    opts.sheetHeadings === "auto" ? sheetNames.length > 1 : opts.sheetHeadings;

  const sheetResults = sheetNames.map((name) => {
    const ws = workbook.Sheets[name];
    return convertSheet(ws, name, allSheetNames.indexOf(name), opts);
  });

  // Combine sheets
  const parts: string[] = [];
  for (const sheet of sheetResults) {
    if (addSheetHeadings) {
      // Escape special characters so sheet names don't break Markdown inline syntax (ADR-0020).
      parts.push(`## ${escapeMarkdownHeading(sheet.name)}\n\n${sheet.markdown}`);
    } else {
      parts.push(sheet.markdown);
    }
  }

  const separator = "\n".repeat(opts.blankLinesBetweenRegions + 2);
  const markdown = parts.filter(Boolean).join(separator);

  return { markdown, sheets: sheetResults };
}
