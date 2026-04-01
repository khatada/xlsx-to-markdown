import type { ConvertOptions, ResolvedOptions } from './types.js';

export function resolveOptions(opts: ConvertOptions = {}): ResolvedOptions {
  return {
    sheets: opts.sheets,
    sheetHeadings: opts.sheetHeadings ?? 'auto',
    headerRow: opts.headerRow ?? true,
    tableDetection: {
      minColumns: opts.tableDetection?.minColumns ?? 2,
      minRows: opts.tableDetection?.minRows ?? 2,
      useBorders: opts.tableDetection?.useBorders ?? true,
    },
    richText: opts.richText ?? true,
    emptyCell: opts.emptyCell ?? '',
    dateFormat: opts.dateFormat ?? 'YYYY-MM-DD',
    blankLinesBetweenRegions: opts.blankLinesBetweenRegions ?? 1,
  };
}
