import type { RowInfo, RegionType, ResolvedOptions } from "./types.js";

export interface RawRegion {
  type: RegionType;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * Analyse the RowInfo array and produce an ordered list of raw regions.
 *
 * Algorithm:
 * 1. Rows with 0 filled cells are "gap" rows and terminate any open region.
 * 2. Rows with filledCount >= minColumns (or with borders) are "dense" rows
 *    and can belong to a table region.
 * 3. Rows with filledCount < minColumns are "sparse" rows and form paragraph
 *    regions.
 * 4. Adjacent dense rows that share an overlapping column range are merged
 *    into a single table candidate.
 * 5. If a table candidate has fewer rows than minRows it is demoted to a
 *    paragraph.
 */
export function detectRegions(rows: RowInfo[], opts: ResolvedOptions): RawRegion[] {
  const { minColumns, minRows } = opts.tableDetection;
  const regions: RawRegion[] = [];

  let i = 0;
  while (i < rows.length) {
    const row = rows[i];

    // Skip empty rows
    if (row.filledCount === 0) {
      i++;
      continue;
    }

    // Determine if this row looks "dense" enough to start a table
    const rowIsDense = row.filledCount >= minColumns;

    if (rowIsDense) {
      // Try to grow a table region downward
      const tableRows: RowInfo[] = [row];
      let minCol = row.minCol;
      let maxCol = row.maxCol;
      let j = i + 1;

      while (j < rows.length) {
        const next = rows[j];
        if (next.filledCount === 0) break; // gap row ends the table

        // Check column overlap with the current table bounding box.
        // We allow a row to extend the bbox, but we require at least some overlap
        // so that two unrelated narrow tables don't merge.
        const overlap =
          next.minCol <= maxCol + 1 && // not too far right
          next.maxCol >= minCol - 1; // not too far left

        if (!overlap) break;

        tableRows.push(next);
        minCol = Math.min(minCol, next.minCol);
        maxCol = Math.max(maxCol, next.maxCol);
        j++;
      }

      if (tableRows.length >= minRows) {
        regions.push({
          type: "table",
          startRow: tableRows[0].index,
          endRow: tableRows[tableRows.length - 1].index,
          startCol: minCol,
          endCol: maxCol,
        });
      } else {
        // Not enough rows for a table → emit each as a paragraph
        for (const tr of tableRows) {
          regions.push(makeParagraph(tr));
        }
      }
      i = j;
    } else {
      // Sparse row → paragraph
      // Group consecutive sparse (non-empty) rows together when they are in
      // the same narrow column range (e.g. a block of text all in column A).
      const paraRows: RowInfo[] = [row];
      let minCol = row.minCol;
      let maxCol = row.maxCol;
      let j = i + 1;

      while (j < rows.length) {
        const next = rows[j];
        if (next.filledCount === 0) break; // gap
        if (next.filledCount >= minColumns) break; // next is dense
        paraRows.push(next);
        minCol = Math.min(minCol, next.minCol);
        maxCol = Math.max(maxCol, next.maxCol);
        j++;
      }

      regions.push({
        type: "paragraph",
        startRow: paraRows[0].index,
        endRow: paraRows[paraRows.length - 1].index,
        startCol: minCol,
        endCol: maxCol,
      });
      i = j;
    }
  }

  return regions;
}

function makeParagraph(row: RowInfo): RawRegion {
  return {
    type: "paragraph",
    startRow: row.index,
    endRow: row.index,
    startCol: row.minCol,
    endCol: row.maxCol,
  };
}
