import * as XLSX from "xlsx";
import type { Region, ResolvedOptions, RowInfo, SheetResult } from "./types.js";
import { detectRegions } from "./region-detector.js";
import { renderTable, isSingleCellPerRow } from "./table-renderer.js";
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

  const mergedCellInfo = buildMergedCellInfo(merges);

  // Excel ListObject tables always have an autofilter; use that range to treat
  // all cells within it as non-empty regardless of their value.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autofilterRef: string | undefined = (ws["!autofilter"] as any)?.ref;
  const autofilterRange = autofilterRef ? XLSX.utils.decode_range(autofilterRef) : null;

  // Issue 1: Build sets of hidden row/column indices for use in detection and rendering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowsConfig: any[] = (ws["!rows"] as any) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colsConfig: any[] = (ws["!cols"] as any) ?? [];
  const hiddenRows = new Set<number>();
  const hiddenCols = new Set<number>();
  for (let r = range.s.r; r <= range.e.r; r++) {
    if (rowsConfig[r]?.hidden) hiddenRows.add(r);
  }
  for (let c = range.s.c; c <= range.e.c; c++) {
    if (colsConfig[c]?.hidden) hiddenCols.add(c);
  }

  // Collect RowInfo for each row in the sheet
  const rowInfos: RowInfo[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    if (hiddenRows.has(r)) continue; // Issue 1: skip hidden rows

    let filledCount = 0;
    let hasBorder = false;
    let hasVerticalBorder = false;
    const filledCols = new Set<number>();

    for (let c = range.s.c; c <= range.e.c; c++) {
      if (hiddenCols.has(c)) continue; // Issue 1: skip hidden columns

      const addr = XLSX.utils.encode_cell({ r, c });

      if (mergedCellInfo.childCells.has(addr)) {
        // Issue 2: check master cell's borders for this merged child
        if (!hasBorder || !hasVerticalBorder) {
          const masterAddr = mergedCellInfo.childToMaster.get(addr);
          if (masterAddr) {
            const masterCell: XLSX.CellObject | undefined = ws[masterAddr];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const style: any = (masterCell as any)?.s;
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

        // Vertical rowspan: the master cell is in a previous row and spans into
        // this row. Count this column as filled so that rows under a rowspan are
        // not penalised in the density check (which would cause the band to be
        // classified as a paragraph instead of a table).
        if (!filledCols.has(c)) {
          const masterAddr = mergedCellInfo.childToMaster.get(addr);
          if (masterAddr) {
            const masterPos = XLSX.utils.decode_cell(masterAddr);
            if (masterPos.r < r) {
              const masterCell: XLSX.CellObject | undefined = ws[masterAddr];
              const masterHasValue =
                masterCell !== undefined &&
                masterCell.v !== undefined &&
                masterCell.v !== null &&
                masterCell.v !== "";
              if (masterHasValue) {
                filledCols.add(c);
                filledCount++;
              }
            }
          }
        }

        continue;
      }

      const cell: XLSX.CellObject | undefined = ws[addr];
      const hasValue =
        cell !== undefined && cell.v !== undefined && cell.v !== null && cell.v !== "";
      const inAutofilter =
        autofilterRange !== null &&
        r >= autofilterRange.s.r &&
        r <= autofilterRange.e.r &&
        c >= autofilterRange.s.c &&
        c <= autofilterRange.e.c;

      if (hasValue) {
        filledCols.add(c);
        filledCount++;

        // Issue 6: for horizontally merged master cells, count all spanned
        // columns so that density reflects the visual column footprint
        const colEnd = mergedCellInfo.masterColEnd.get(addr);
        if (colEnd !== undefined) {
          for (let sc = c + 1; sc <= colEnd; sc++) {
            if (hiddenCols.has(sc)) continue; // Issue 1
            filledCols.add(sc);
            filledCount++;
          }
        }
      } else if (inAutofilter && !filledCols.has(c)) {
        // Cells within an Excel table (autofilter) range are treated as non-empty
        // so that empty cells in a ListObject do not break table detection.
        filledCols.add(c);
        filledCount++;
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
            // When useBorders is enabled, treat cells with BOTH left and right
            // vertical borders as non-empty so that bordered-but-valueless cells
            // (common in Excel table formatting) contribute to column density.
            if (
              opts.tableDetection.useBorders &&
              b.left?.style &&
              b.right?.style &&
              !filledCols.has(c)
            ) {
              filledCols.add(c);
              filledCount++;
            }
          }
        }
      }
    }

    rowInfos.push({
      index: r,
      filledCols,
      minCol: filledCols.size > 0 ? Math.min(...filledCols) : -1,
      maxCol: filledCols.size > 0 ? Math.max(...filledCols) : -1,
      filledCount,
      hasBorder,
      hasVerticalBorder,
    });
  }

  const rawRegions = detectRegions(rowInfos, opts);

  // Render each region
  const regions: Region[] = rawRegions.map((raw) => {
    let markdown = "";

    if (
      raw.type === "table" &&
      !isSingleCellPerRow(
        raw.startRow,
        raw.endRow,
        raw.startCol,
        raw.endCol,
        merges,
        hiddenRows,
        hiddenCols,
      )
    ) {
      markdown = renderTable(
        ws,
        raw.startRow,
        raw.endRow,
        raw.startCol,
        raw.endCol,
        merges,
        opts,
        hiddenRows,
        hiddenCols,
      );
    } else {
      markdown = renderParagraph(
        ws,
        raw.startRow,
        raw.endRow,
        raw.startCol,
        raw.endCol,
        merges,
        opts,
        hiddenRows,
        hiddenCols,
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

interface MergedCellInfo {
  /** Addresses of merged child cells (not the master) */
  childCells: Set<string>;
  /** Maps child cell address → master cell address */
  childToMaster: Map<string, string>;
  /** Maps master cell address → end column index (only for horizontal spans) */
  masterColEnd: Map<string, number>;
}

function buildMergedCellInfo(merges: XLSX.Range[]): MergedCellInfo {
  const childCells = new Set<string>();
  const childToMaster = new Map<string, string>();
  const masterColEnd = new Map<string, number>();

  for (const m of merges) {
    const masterAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c });

    if (m.e.c > m.s.c) {
      masterColEnd.set(masterAddr, m.e.c);
    }

    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue;
        const childAddr = XLSX.utils.encode_cell({ r, c });
        childCells.add(childAddr);
        childToMaster.set(childAddr, masterAddr);
      }
    }
  }

  return { childCells, childToMaster, masterColEnd };
}
