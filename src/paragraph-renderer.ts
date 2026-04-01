import * as XLSX from 'xlsx';
import type { ResolvedOptions } from './types.js';
import { extractCellData } from './cell-formatter.js';

/**
 * Render a paragraph region as a Markdown paragraph.
 *
 * For each non-empty cell in the region (scanned left-to-right, top-to-bottom),
 * the text content is collected.  Multiple cells in the same row are joined
 * with a space.  Each row becomes one "line" in the paragraph block.
 * Consecutive non-empty lines are separated by a blank line only when a
 * completely empty row appears between them; otherwise they are joined as a
 * single paragraph.
 */
export function renderParagraph(
  ws: XLSX.WorkSheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  merges: XLSX.Range[],
  opts: ResolvedOptions,
): string {
  const mergedChildCells = buildMergedChildSet(merges);

  const lines: string[] = [];

  for (let r = startRow; r <= endRow; r++) {
    const parts: string[] = [];
    for (let c = startCol; c <= endCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell: XLSX.CellObject | undefined = ws[addr];
      const data = extractCellData(cell, mergedChildCells, addr, opts);
      if (!data.isMergedChild && data.value.trim()) {
        parts.push(data.value.trim());
      }
    }
    if (parts.length > 0) {
      lines.push(parts.join(' '));
    }
  }

  return lines.join('\n\n');
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
