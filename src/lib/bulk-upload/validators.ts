import type { BulkUploadColumn, CellError, LookupData } from "@/types/bulk-upload";

/**
 * Validate a single cell value against its column config.
 * Returns null if valid, or a CellError if invalid.
 */
export function validateCell(
  value: unknown,
  column: BulkUploadColumn,
  rowIndex: number,
  lookups: LookupData,
): CellError | null {
  const strVal = value != null ? String(value).trim() : "";

  // Required check
  if (column.required && !strVal) {
    return {
      row: rowIndex,
      column: column.header,
      message: `${column.header} is required`,
    };
  }

  // Skip further validation if empty and not required
  if (!strVal) return null;

  switch (column.type) {
    case "number": {
      const num = Number(strVal);
      if (isNaN(num)) {
        return {
          row: rowIndex,
          column: column.header,
          message: `${column.header} must be a number`,
        };
      }
      if (num < 0) {
        return {
          row: rowIndex,
          column: column.header,
          message: `${column.header} must be positive`,
        };
      }
      break;
    }

    case "text": {
      if (column.maxLength && strVal.length > column.maxLength) {
        return {
          row: rowIndex,
          column: column.header,
          message: `${column.header} exceeds max length of ${column.maxLength}`,
        };
      }
      break;
    }

    case "select": {
      const options = column.options ?? lookups[column.lookupKey!] ?? [];
      const valid = options.some(
        (o) => o.label.toLowerCase() === strVal.toLowerCase(),
      );
      if (!valid) {
        return {
          row: rowIndex,
          column: column.header,
          message: `Invalid ${column.header}. Valid: ${options.slice(0, 5).map((o) => o.label).join(", ")}${options.length > 5 ? "..." : ""}`,
        };
      }
      break;
    }

    case "multi-select": {
      const options = lookups[column.lookupKey!] ?? [];
      const values = strVal
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      for (const v of values) {
        const valid = options.some(
          (o) => o.label.toLowerCase() === v.toLowerCase(),
        );
        if (!valid) {
          return {
            row: rowIndex,
            column: column.header,
            message: `Invalid value "${v}" in ${column.header}`,
          };
        }
      }
      break;
    }

    case "boolean": {
      const normalized = strVal.toLowerCase();
      if (!["yes", "no", "1", "0", "true", "false"].includes(normalized)) {
        return {
          row: rowIndex,
          column: column.header,
          message: `${column.header} must be Yes or No`,
        };
      }
      break;
    }
  }

  return null;
}

/**
 * Resolve a cell's display value to a DB-ready value using lookups.
 * E.g., brand name → brand_id, "Yes" → 1.
 */
export function resolveValue(
  value: unknown,
  column: BulkUploadColumn,
  lookups: LookupData,
): unknown {
  const strVal = value != null ? String(value).trim() : "";
  if (!strVal) return null;

  switch (column.type) {
    case "number":
      return Number(strVal);

    case "boolean":
      return ["yes", "1", "true"].includes(strVal.toLowerCase()) ? 1 : 0;

    case "select": {
      const options = column.options ?? lookups[column.lookupKey!] ?? [];
      const match = options.find(
        (o) => o.label.toLowerCase() === strVal.toLowerCase(),
      );
      return match?.value ?? null;
    }

    case "multi-select": {
      const options = lookups[column.lookupKey!] ?? [];
      const values = strVal
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return values
        .map((v) => {
          const match = options.find(
            (o) => o.label.toLowerCase() === v.toLowerCase(),
          );
          return match?.value;
        })
        .filter((v) => v != null);
    }

    default:
      return strVal;
  }
}
