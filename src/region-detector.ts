import type { RowInfo, RegionType, ResolvedOptions } from "./types.js";

export interface RawRegion {
  type: RegionType;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * Detect content regions from a list of RowInfo objects.
 *
 * Algorithm (recursive):
 * 1. Split rows by empty rows → "bands" of consecutive non-empty rows
 * 2. Within each band, find contiguous column groups (split at all-empty columns)
 * 3. If multiple column groups exist → recurse into each (handles side-by-side tables)
 * 4. If a single column group → classify rows as table or paragraph by density
 */
export function detectRegions(rows: RowInfo[], opts: ResolvedOptions): RawRegion[] {
  const nonEmpty = rows.filter((r) => r.filledCount > 0);
  if (nonEmpty.length === 0) return [];
  const colStart = Math.min(...nonEmpty.map((r) => r.minCol));
  const colEnd = Math.max(...nonEmpty.map((r) => r.maxCol));
  return detectInRange(rows, colStart, colEnd, opts);
}

// ---------------------------------------------------------------------------
// Core recursive implementation
// ---------------------------------------------------------------------------

function detectInRange(
  rows: RowInfo[],
  colStart: number,
  colEnd: number,
  opts: ResolvedOptions,
): RawRegion[] {
  const regions: RawRegion[] = [];
  let i = 0;

  while (i < rows.length) {
    if (countInRange(rows[i].filledCols, colStart, colEnd) === 0) {
      i++;
      continue;
    }

    // Collect a band: consecutive rows with ≥1 filled cell in [colStart, colEnd]
    const band: RowInfo[] = [];
    let j = i;
    while (j < rows.length && countInRange(rows[j].filledCols, colStart, colEnd) > 0) {
      band.push(rows[j]);
      j++;
    }

    // Build the set of filled columns within this band
    const bandFilledCols = new Set<number>();
    for (const r of band) {
      for (const c of r.filledCols) {
        if (c >= colStart && c <= colEnd) bandFilledCols.add(c);
      }
    }

    // Split the band by column gaps
    const subRanges = findColSubRanges(bandFilledCols);

    if (subRanges.length > 1) {
      // Multiple column groups → recurse into each (separates side-by-side tables)
      for (const [sc, ec] of subRanges) {
        regions.push(...detectInRange(band, sc, ec, opts));
      }
    } else {
      // Single column group → classify rows by density
      const [sc, ec] = subRanges[0] ?? [colStart, colEnd];
      regions.push(...classifyBand(band, sc, ec, opts));
    }

    i = j;
  }

  return regions;
}

/**
 * Classify a band of rows (no empty rows) within a fixed column range into
 * table and paragraph regions based on row density.
 */
function classifyBand(
  band: RowInfo[],
  colStart: number,
  colEnd: number,
  opts: ResolvedOptions,
): RawRegion[] {
  const { minColumns, minRows } = opts.tableDetection;
  const regions: RawRegion[] = [];
  let i = 0;

  while (i < band.length) {
    const filled = countInRange(band[i].filledCols, colStart, colEnd);

    if (filled >= minColumns) {
      // Dense row — try to extend a table downward
      const tableRows: RowInfo[] = [band[i]];
      let j = i + 1;
      while (j < band.length && countInRange(band[j].filledCols, colStart, colEnd) >= minColumns) {
        tableRows.push(band[j]);
        j++;
      }

      if (tableRows.length >= minRows) {
        regions.push({
          type: "table",
          startRow: tableRows[0].index,
          endRow: tableRows[tableRows.length - 1].index,
          startCol: colStart,
          endCol: colEnd,
        });
      } else {
        // Below minRows → demote each dense row to its own paragraph
        for (const r of tableRows) {
          regions.push({
            type: "paragraph",
            startRow: r.index,
            endRow: r.index,
            startCol: colStart,
            endCol: colEnd,
          });
        }
      }
      i = j;
    } else {
      // Sparse rows → paragraph
      const paraRows: RowInfo[] = [band[i]];
      let j = i + 1;
      while (j < band.length && countInRange(band[j].filledCols, colStart, colEnd) < minColumns) {
        paraRows.push(band[j]);
        j++;
      }
      regions.push({
        type: "paragraph",
        startRow: paraRows[0].index,
        endRow: paraRows[paraRows.length - 1].index,
        startCol: colStart,
        endCol: colEnd,
      });
      i = j;
    }
  }

  return regions;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find contiguous column sub-ranges from a set of filled column indices.
 * Columns with a gap (≥2 apart) start a new sub-range.
 */
function findColSubRanges(filledCols: Set<number>): [number, number][] {
  const sorted = [...filledCols].sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const ranges: [number, number][] = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] > prev + 1) {
      ranges.push([rangeStart, prev]);
      rangeStart = sorted[i];
    }
    prev = sorted[i];
  }
  ranges.push([rangeStart, prev]);
  return ranges;
}

function countInRange(filledCols: Set<number>, colStart: number, colEnd: number): number {
  let count = 0;
  for (const c of filledCols) {
    if (c >= colStart && c <= colEnd) count++;
  }
  return count;
}
