import * as XLSX from "xlsx";
import type { Region, ResolvedOptions, RowInfo, SheetResult } from "./types.js";
import { detectRegions } from "./region-detector.js";
import { renderTable } from "./table-renderer.js";
import { renderParagraph } from "./paragraph-renderer.js";

/**
 * Convert a single worksheet to Markdown.
 */
export function convertSheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
  sheetIndex: number,
  opts: ResolvedOptions,
): SheetResult {
  const ref = ws["!ref"];
  if (!ref) {
    return { name: sheetName, index: sheetIndex, markdown: "", regions: [] };
  }

  const range = XLSX.utils.decode_range(ref);
  const merges: XLSX.Range[] = ws["!merges"] ?? [];

  // Build set of merged-child addresses once for row analysis
  const mergedChildCells = buildMergedChildSet(merges);

  // Collect RowInfo for each row in the sheet
  const rowInfos: RowInfo[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    let minCol = Infinity;
    let maxCol = -Infinity;
    let filledCount = 0;
    let hasBorder = false;
    let hasVerticalBorder = false;
    const filledCols = new Set<number>();

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (mergedChildCells.has(addr)) continue;

      const cell: XLSX.CellObject | undefined = ws[addr];
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
        filledCols.add(c);
        filledCount++;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
      }

      // Check for borders on any cell (including empty cells)
      if (cell) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const style: any = (cell as any).s;
        if (style?.border) {
          const b = style.border;
          if (b.top?.style || b.bottom?.style || b.left?.style || b.right?.style) {
            hasBorder = true;
          }
          if (b.left?.style || b.right?.style) {
            hasVerticalBorder = true;
          }
        }
      }
    }

    rowInfos.push({
      index: r,
      filledCols,
      minCol: minCol === Infinity ? -1 : minCol,
      maxCol: maxCol === -Infinity ? -1 : maxCol,
      filledCount,
      hasBorder,
      hasVerticalBorder,
    });
  }

  const rawRegions = detectRegions(rowInfos, opts);

  // Render each region
  const regions: Region[] = rawRegions.map((raw) => {
    let markdown = "";

    if (raw.type === "table") {
      markdown = renderTable(ws, raw.startRow, raw.endRow, raw.startCol, raw.endCol, merges, opts);
    } else {
      markdown = renderParagraph(
        ws,
        raw.startRow,
        raw.endRow,
        raw.startCol,
        raw.endCol,
        merges,
        opts,
      );
    }

    return { ...raw, markdown };
  });

  const separator = "\n".repeat(opts.blankLinesBetweenRegions + 1);
  const markdown = regions
    .map((r) => r.markdown)
    .filter(Boolean)
    .join(separator);

  return { name: sheetName, index: sheetIndex, markdown, regions };
}

function buildMergedChildSet(merges: XLSX.Range[]): Set<string> {
  const set = new Set<string>();
  for (const m of merges) {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue;
        set.add(XLSX.utils.encode_cell({ r, c }));
      }
    }
  }
  return set;
}
