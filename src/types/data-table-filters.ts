import type { LucideIcon } from "lucide-react";

// ── Filter option (for multi-select and boolean filters) ──────────────

export interface FilterOption {
  label: string;
  value: string;
  icon?: LucideIcon;
}

// ── Date preset ───────────────────────────────────────────────────────

export interface DatePreset {
  label: string;
  /** Returns [from, to] date range */
  getRange: () => [Date, Date];
}

// ── Base filter config ────────────────────────────────────────────────

interface BaseFilterConfig {
  /** Must match the column's accessorKey or custom id */
  columnId: string;
  /** Display label in the filter popover */
  label: string;
  /** Optional section header for grouped popovers (e.g. "Status", "Product") */
  group?: string;
}

// ── Multi-select filter ───────────────────────────────────────────────

export interface MultiSelectFilterConfig extends BaseFilterConfig {
  type: "multi-select";
  /**
   * Static options list.
   * If omitted, options are auto-derived from getFacetedUniqueValues().
   */
  options?: FilterOption[];
  /** Column ID that this filter cascades from (restricts available options) */
  cascadeFrom?: string;
  /**
   * Map from parent value → allowed child values.
   * Required when cascadeFrom is set.
   */
  cascadeMap?: Record<string, string[]>;
}

// ── Boolean filter ────────────────────────────────────────────────────

export interface BooleanFilterConfig extends BaseFilterConfig {
  type: "boolean";
  /** Label for the "true" option (e.g. "Active", "Verified") */
  trueLabel: string;
  /** Label for the "false" option (e.g. "Inactive", "Unverified") */
  falseLabel: string;
  /** The raw value that represents "true" in data (default: "1") */
  trueValue?: string;
  /** The raw value that represents "false" in data (default: "0") */
  falseValue?: string;
}

// ── Date range filter ─────────────────────────────────────────────────

export interface DateRangeFilterConfig extends BaseFilterConfig {
  type: "date-range";
  /** Show preset quick-select buttons (default: true) */
  showPresets?: boolean;
}

// ── Number range filter ───────────────────────────────────────────────

export interface NumberRangeFilterConfig extends BaseFilterConfig {
  type: "number-range";
  /** Fixed min (if omitted, auto-derived from getFacetedMinMaxValues) */
  min?: number;
  /** Fixed max (if omitted, auto-derived from getFacetedMinMaxValues) */
  max?: number;
  /** Slider step (default: 1) */
  step?: number;
  /** Format label for display (e.g. "MMK", "USD") */
  unit?: string;
}

// ── Union type ────────────────────────────────────────────────────────

export type FilterConfig =
  | MultiSelectFilterConfig
  | BooleanFilterConfig
  | DateRangeFilterConfig
  | NumberRangeFilterConfig;

// ── Active filter value types ─────────────────────────────────────────

export type FilterValue =
  | string[] // multi-select: selected values
  | [string, string] // boolean: ["1"] or ["0"] (stored as array for consistency)
  | [Date, Date] // date-range: [from, to]
  | [number, number]; // number-range: [min, max]

export type ActiveFilters = Record<string, FilterValue>;
