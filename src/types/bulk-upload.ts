/** A single column definition in the Excel template */
export interface BulkUploadColumn {
  /** Excel column header text */
  header: string;
  /** DB field name this maps to */
  field: string;
  /** Data type for validation */
  type: "text" | "number" | "boolean" | "select" | "multi-select";
  /** Required field? */
  required: boolean;
  /** Max character length (for text) */
  maxLength?: number;
  /** For 'select' / 'multi-select': static options */
  options?: { label: string; value: string | number }[];
  /** Lookup key to fetch options dynamically from DB */
  lookupKey?: string;
  /** Help text shown as an Excel cell comment */
  helpText?: string;
  /** Column width in Excel (characters) */
  excelWidth?: number;
  /** Dependent dropdown: filter this column's options based on another column */
  dependsOn?: {
    /** Field name of the parent column */
    parentField: string;
    /** Key to fetch association data (parentLabel → childLabels[]) */
    associationKey: string;
  };
}

/** Image/file field definition */
export interface BulkUploadImageField {
  /** Display label */
  label: string;
  /** Field name for the R2 path */
  field: string;
  /** R2 directory path */
  r2Path: string;
  /** Whether this is the primary image (thumbnail) */
  isPrimary?: boolean;
  /** Max files per row */
  maxPerRow?: number;
}

/** Validation error for a single cell */
export interface CellError {
  row: number;
  column: string;
  message: string;
}

/** Parsed row with validation status */
export interface ParsedRow {
  rowIndex: number;
  data: Record<string, unknown>;
  errors: CellError[];
  images: Record<string, File[]>;
  status: "valid" | "error";
}

/** Import result for a single row */
export interface ImportRowResult {
  rowIndex: number;
  status: "success" | "error" | "skipped";
  error?: string;
  createdId?: number;
}

/** Overall import result */
export interface ImportResult {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  rows: ImportRowResult[];
}

/** Lookup data fetched from DB for validation and template generation */
export type LookupData = Record<
  string,
  { label: string; value: string | number }[]
>;

/** Full configuration for an entity's bulk upload */
export interface BulkUploadConfig {
  /** Entity identifier (used in URL, cache tags, etc.) */
  entityKey: string;
  /** Display name */
  displayName: string;
  /** Plural display name */
  displayNamePlural: string;
  /** Max rows allowed per upload */
  maxRows: number;
  /** Column definitions */
  columns: BulkUploadColumn[];
  /** Image fields (optional) */
  imageFields?: BulkUploadImageField[];
  /** Lookup keys needed from DB for validation/dropdowns */
  lookupKeys: string[];
  /** Cache tags to invalidate after import */
  cacheTags: string[];
  /** Instructions text shown on the template step */
  instructions?: string;
  /** Sample data rows for the template */
  sampleData?: Record<string, unknown>[];
  /** Route to navigate back to the entity list */
  returnRoute: string;
}
