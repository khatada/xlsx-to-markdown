/**
 * Options for XLSX to Markdown conversion
 */
export interface ConvertOptions {
  /**
   * Sheets to include by name or index (0-based).
   * Default: all sheets
   */
  sheets?: (string | number)[];

  /**
   * Add "## Sheet Name" heading before each sheet's content.
   * Default: true when the workbook has multiple sheets
   */
  sheetHeadings?: boolean;

  /**
   * Treat the first row of each detected table as a header row.
   * Default: true
   */
  headerRow?: boolean;

  /**
   * Table detection thresholds.
   */
  tableDetection?: {
    /**
     * Minimum number of columns for a region to be treated as a table.
     * Default: 2
     */
    minColumns?: number;

    /**
     * Minimum number of rows for a region to be treated as a table.
     * Default: 2
     */
    minRows?: number;

    /**
     * Use cell borders as a hint when classifying regions.
     * Default: true
     */
    useBorders?: boolean;
  };

  /**
   * Preserve rich-text formatting (bold → **, italic → _, etc.)
   * Default: true
   */
  richText?: boolean;

  /**
   * Placeholder text for empty table cells.
   * Default: "" (empty string)
   */
  emptyCell?: string;

  /**
   * Format string for dates.
   * Uses simple tokens: YYYY MM DD HH mm ss
   * Default: ISO 8601 (YYYY-MM-DD)
   */
  dateFormat?: string;

  /**
   * Number of blank lines to insert between regions.
   * Default: 1
   */
  blankLinesBetweenRegions?: number;
}

/**
 * Resolved options with all defaults filled in.
 */
export interface ResolvedOptions {
  sheets?: (string | number)[];
  sheetHeadings: boolean | 'auto';
  headerRow: boolean;
  tableDetection: {
    minColumns: number;
    minRows: number;
    useBorders: boolean;
  };
  richText: boolean;
  emptyCell: string;
  dateFormat: string;
  blankLinesBetweenRegions: number;
}

/**
 * Type of a detected region within a sheet.
 */
export type RegionType = 'table' | 'paragraph' | 'heading';

/**
 * A detected content region in a sheet.
 */
export interface Region {
  type: RegionType;
  /** Inclusive 0-based row index where this region starts */
  startRow: number;
  /** Inclusive 0-based row index where this region ends */
  endRow: number;
  /** Inclusive 0-based column index where this region starts */
  startCol: number;
  /** Inclusive 0-based column index where this region ends */
  endCol: number;
  /** The rendered Markdown for this region */
  markdown: string;
}

/**
 * Conversion result for a single sheet.
 */
export interface SheetResult {
  name: string;
  index: number;
  markdown: string;
  regions: Region[];
}

/**
 * Full conversion result.
 */
export interface ConvertResult {
  /** Combined Markdown for all sheets */
  markdown: string;
  sheets: SheetResult[];
}

/**
 * Represents a single parsed cell value (after formatting).
 */
export interface CellData {
  /** Display value as a string */
  value: string;
  /** Whether the cell has a bold format */
  bold: boolean;
  /** Whether the cell has an italic format */
  italic: boolean;
  /** Hyperlink URL, if any */
  hyperlink?: string;
  /** Horizontal alignment */
  alignment?: 'left' | 'center' | 'right';
  /** True when this cell is part of a merge but is not the top-left "master" cell */
  isMergedChild: boolean;
  /** True when this cell has any border (used for table detection) */
  hasBorder: boolean;
}

/**
 * Internal row data used during region detection.
 */
export interface RowInfo {
  /** 0-based row index */
  index: number;
  /** Columns with content, as a Set of 0-based column indices */
  filledCols: Set<number>;
  /** Min filled column index (-1 if empty row) */
  minCol: number;
  /** Max filled column index (-1 if empty row) */
  maxCol: number;
  /** Number of filled (non-child-merge) cells */
  filledCount: number;
}
