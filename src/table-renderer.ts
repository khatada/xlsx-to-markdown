import * as XLSX from 'xlsx';
import type { CellData, ResolvedOptions } from './types.js';
import { extractCellData, escapeTableCell } from './cell-formatter.js';

/**
 * Render a table region as a GFM (GitHub Flavored Markdown) table.
 *
 * @param ws          - The worksheet
 * @param startRow    - First row (0-based)
 * @param endRow      - Last row (0-based, inclusive)
 * @param startCol    - First column (0-based)
 * @param endCol      - Last column (0-based, inclusive)
 * @param merges      - Merged cell ranges from ws['!merges']
 * @param opts        - Resolved options
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
  // Build a set of addresses that are "child" merged cells (not the top-left master)
  const mergedChildCells = buildMergedChildSet(merges);

  // Build a 2-D grid of CellData
  const grid: CellData[][] = [];
  for (let r = startRow; r <= endRow; r++) {
    const rowData: CellData[] = [];
    for (let c = startCol; c <= endCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell: XLSX.CellObject | undefined = ws[addr];
      rowData.push(extractCellData(cell, mergedChildCells, addr, opts));
    }
    grid.push(rowData);
  }

  const colCount = endCol - startCol + 1;

  // Determine column alignment by sampling the first data row (non-header)
  const alignments = inferColumnAlignments(grid, opts.headerRow);

  // Render rows
  const lines: string[] = [];

  let dataStartIdx = 0;
  if (opts.headerRow) {
    lines.push(renderRow(grid[0], opts.emptyCell));
    lines.push(renderSeparatorRow(colCount, alignments));
    dataStartIdx = 1;
  } else {
    // No header: emit a blank header row + separator so the GFM table is valid
    lines.push(renderBlankRow(colCount));
    lines.push(renderSeparatorRow(colCount, alignments));
  }

  for (let i = dataStartIdx; i < grid.length; i++) {
    lines.push(renderRow(grid[i], opts.emptyCell));
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderRow(cells: CellData[], emptyPlaceholder: string): string {
  const parts = cells.map((c) => {
    let val = c.isMergedChild ? '' : c.value;
    if (!val) val = emptyPlaceholder;
    // Newlines inside cells become <br> in markdown tables
    val = val.replace(/\n/g, '<br>');
    return escapeTableCell(val);
  });
  return `| ${parts.join(' | ')} |`;
}

function renderBlankRow(colCount: number): string {
  return `| ${Array(colCount).fill('').join(' | ')} |`;
}

function renderSeparatorRow(
  colCount: number,
  alignments: ('left' | 'center' | 'right')[],
): string {
  const seps = Array.from({ length: colCount }, (_, i) => {
    const a = alignments[i] ?? 'left';
    if (a === 'center') return ':---:';
    if (a === 'right') return '---:';
    return '---';
  });
  return `| ${seps.join(' | ')} |`;
}

/**
 * Infer the best alignment for each column.
 * Priority: explicit cell alignment > numeric content > left
 */
function inferColumnAlignments(
  grid: CellData[][],
  hasHeader: boolean,
): ('left' | 'center' | 'right')[] {
  if (grid.length === 0) return [];
  const colCount = grid[0].length;
  const dataRows = hasHeader ? grid.slice(1) : grid;
  const result: ('left' | 'center' | 'right')[] = [];

  for (let c = 0; c < colCount; c++) {
    // Check if an explicit alignment is set on any data cell
    let explicit: 'left' | 'center' | 'right' | undefined;
    for (const row of dataRows) {
      if (row[c]?.alignment) {
        explicit = row[c].alignment;
        break;
      }
    }
    if (explicit) {
      result.push(explicit);
      continue;
    }

    // Infer from content: if all non-empty values are numeric → right-align
    const allNumeric = dataRows.every((row) => {
      const v = row[c]?.value ?? '';
      return v === '' || /^-?[\d,]+(\.\d+)?%?$/.test(v.trim());
    });
    result.push(allNumeric && dataRows.some((r) => r[c]?.value) ? 'right' : 'left');
  }

  return result;
}

/**
 * Build a Set of cell addresses that are "child" cells in a merge
 * (i.e. not the top-left master cell of the merged range).
 */
function buildMergedChildSet(merges: XLSX.Range[]): Set<string> {
  const set = new Set<string>();
  for (const m of merges) {
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (r === m.s.r && c === m.s.c) continue; // master cell
        set.add(XLSX.utils.encode_cell({ r, c }));
      }
    }
  }
  return set;
}
