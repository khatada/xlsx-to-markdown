import * as XLSX from 'xlsx';

/**
 * Build a simple WorkBook from a 2-D array of cell values.
 * Row/column indices are 0-based.
 * Pass `undefined` for empty cells.
 */
export function buildWorkbook(
  sheets: { name: string; data: (string | number | undefined)[][] }[],
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const { name, data } of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(data.map((row) => row.map((v) => v ?? null)));
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return wb;
}

/**
 * Normalise whitespace/newlines in markdown output so test assertions are
 * not fragile against trailing spaces.
 */
export function normalise(md: string): string {
  return md
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();
}
