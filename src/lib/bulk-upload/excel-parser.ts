import ExcelJS from "exceljs";
import type { BulkUploadConfig } from "@/types/bulk-upload";

/**
 * Mapping from Excel column number → how to read it.
 * - "regular": value goes directly to `field`
 * - "option":  value is Yes/No; collect all Yes options into a
 *              comma-separated string for the parent `field`
 */
type ColMapping =
  | { kind: "regular"; field: string; colNumber: number }
  | { kind: "option"; field: string; optionLabel: string; colNumber: number };

/**
 * Parse an uploaded Excel file and return raw row data.
 *
 * Supports two header layouts:
 * - **Single-row**: all columns have simple headers in row 1. Data starts row 2.
 * - **Two-row** (multi-select): row 1 has group headers (merged),
 *   row 2 has option names. Data starts row 3.
 */
export async function parseExcelFile(
  file: File,
  config: BulkUploadConfig,
): Promise<Record<string, unknown>[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet =
    workbook.getWorksheet(config.displayNamePlural) ??
    workbook.worksheets.find((ws) => ws.state === "visible") ??
    workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found in the Excel file");

  const hasMultiSelect = config.columns.some((c) => c.type === "multi-select");
  const dataStartRow = hasMultiSelect ? 3 : 2;

  // ── Build column mappings ───────────────────────────────────────────────
  const mappings: ColMapping[] = [];

  if (hasMultiSelect) {
    mappings.push(...buildTwoRowMappings(worksheet, config));
  } else {
    mappings.push(...buildSingleRowMappings(worksheet, config));
  }

  if (mappings.length === 0) {
    throw new Error(
      "No matching headers found. Ensure you are using the correct template.",
    );
  }

  // Check all required columns are mapped
  const mappedFields = new Set(mappings.map((m) => m.field));
  const missingRequired = config.columns
    .filter((c) => c.required && !mappedFields.has(c.field))
    .map((c) => c.header);
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required columns: ${missingRequired.join(", ")}`,
    );
  }

  // ── Parse data rows ────────────────────────────────────────────────────
  const rows: Record<string, unknown>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < dataStartRow) return;

    let hasValue = false;
    const rowData: Record<string, unknown> = {};

    // First pass: read regular columns directly
    for (const m of mappings) {
      if (m.kind !== "regular") continue;
      const value = extractCellValue(row.getCell(m.colNumber));
      rowData[m.field] = value;
      if (value !== null && value !== "") hasValue = true;
    }

    // Second pass: collect multi-select option columns into comma-separated strings
    const optionGroups = new Map<string, string[]>();
    for (const m of mappings) {
      if (m.kind !== "option") continue;
      const value = extractCellValue(row.getCell(m.colNumber));
      const isYes =
        String(value ?? "")
          .trim()
          .toLowerCase() === "yes";
      if (isYes) {
        if (!optionGroups.has(m.field)) optionGroups.set(m.field, []);
        optionGroups.get(m.field)!.push(m.optionLabel);
        hasValue = true;
      }
    }

    // Merge option groups into rowData
    for (const [field, labels] of optionGroups) {
      rowData[field] = labels.join(", ");
    }

    // Ensure multi-select fields exist even if no options selected
    for (const m of mappings) {
      if (m.kind === "option" && !(m.field in rowData)) {
        rowData[m.field] = "";
      }
    }

    if (hasValue) {
      rows.push(rowData);
    }
  });

  return rows;
}

// ─── Header Parsing ─────────────────────────────────────────────────────────

/** Single-row header: match row 1 headers to config columns */
function buildSingleRowMappings(
  worksheet: ExcelJS.Worksheet,
  config: BulkUploadConfig,
): ColMapping[] {
  const mappings: ColMapping[] = [];
  const headerRow = worksheet.getRow(1);

  headerRow.eachCell((cell, colNumber) => {
    const text = normalizeHeader(String(cell.value ?? ""));
    const col = config.columns.find(
      (c) => c.header.toLowerCase() === text.toLowerCase(),
    );
    if (col) {
      mappings.push({ kind: "regular", field: col.field, colNumber });
    }
  });

  return mappings;
}

/** Two-row header: row 1 = group names (possibly merged), row 2 = option labels */
function buildTwoRowMappings(
  worksheet: ExcelJS.Worksheet,
  config: BulkUploadConfig,
): ColMapping[] {
  const mappings: ColMapping[] = [];
  const row1 = worksheet.getRow(1);
  const row2 = worksheet.getRow(2);

  // Build a map of colNumber → row-1 text (handling merged cells)
  const row1Values = new Map<number, string>();
  row1.eachCell((cell, colNumber) => {
    const text = normalizeHeader(String(cell.value ?? ""));
    if (text) row1Values.set(colNumber, text);
  });

  // Propagate merged cell values: if a cell is part of a merge,
  // it shares the value of the top-left cell
  for (const mergeRange of Object.values(worksheet.model.merges ?? {})) {
    // mergeRange format: "A1:D1" or "A1:A2"
    const range = decodeRange(mergeRange as string);
    if (!range) continue;

    const topLeftText = row1Values.get(range.left);
    if (topLeftText && range.top === 1) {
      // Horizontal merge in row 1 — propagate value to all columns
      for (let c = range.left; c <= range.right; c++) {
        row1Values.set(c, topLeftText);
      }
    }
  }

  // Now map each column
  const multiSelectHeaders = new Set(
    config.columns
      .filter((c) => c.type === "multi-select")
      .map((c) => c.header.toLowerCase()),
  );

  const maxCol = Math.max(
    ...[...row1Values.keys()],
    worksheet.columnCount,
  );

  for (let colNum = 1; colNum <= maxCol; colNum++) {
    const groupText = row1Values.get(colNum);
    if (!groupText) continue;

    const col = config.columns.find(
      (c) => c.header.toLowerCase() === groupText.toLowerCase(),
    );
    if (!col) continue;

    if (multiSelectHeaders.has(groupText.toLowerCase())) {
      // This is a multi-select group — row 2 has the option label
      const optionLabel = String(row2.getCell(colNum).value ?? "").trim();
      if (optionLabel) {
        mappings.push({
          kind: "option",
          field: col.field,
          optionLabel,
          colNumber: colNum,
        });
      }
    } else {
      // Regular column (merged vertically, no row 2 value needed)
      // Only add once (avoid duplicates from vertical merges)
      if (!mappings.some((m) => m.kind === "regular" && m.field === col.field)) {
        mappings.push({ kind: "regular", field: col.field, colNumber: colNum });
      }
    }
  }

  return mappings;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/** Strip " *" required marker and trim */
function normalizeHeader(text: string): string {
  return text.replace(/\s*\*$/, "").trim();
}

/** Decode an Excel range string like "A1:D1" into column/row numbers */
function decodeRange(
  range: string,
): { top: number; left: number; bottom: number; right: number } | null {
  const match = range.match(
    /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/,
  );
  if (!match) return null;
  return {
    left: letterToColumn(match[1]),
    top: parseInt(match[2], 10),
    right: letterToColumn(match[3]),
    bottom: parseInt(match[4], 10),
  };
}

/** Convert column letter(s) to 1-based number: A→1, Z→26, AA→27 */
function letterToColumn(letters: string): number {
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col;
}

/** Extract a plain value from an ExcelJS cell */
function extractCellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (value === null || value === undefined) return null;

  if (typeof value === "object" && "richText" in value) {
    return (value as ExcelJS.CellRichTextValue).richText
      .map((rt) => rt.text)
      .join("");
  }

  if (typeof value === "object" && "result" in value) {
    return (value as ExcelJS.CellFormulaValue).result;
  }

  if (typeof value === "object" && "hyperlink" in value) {
    return (value as ExcelJS.CellHyperlinkValue).text;
  }

  return value;
}
