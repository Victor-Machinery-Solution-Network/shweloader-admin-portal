import ExcelJS from "exceljs";
import type { BulkUploadConfig, BulkUploadColumn, LookupData } from "@/types/bulk-upload";
import type { AssociationMap } from "./lookups";

const REF_SHEET = "_ref";

/** Physical Excel column descriptor */
type ColLayout =
  | { kind: "regular"; col: BulkUploadColumn; excelCol: number }
  | { kind: "option"; col: BulkUploadColumn; optionLabel: string; excelCol: number };

/** Info needed to apply INDIRECT data validation for a dependent column */
interface DependentSetup {
  /** Build the INDIRECT formula for a given data row number */
  formula: (row: number) => string;
}

/**
 * Generate a single-sheet Excel template for bulk upload.
 *
 * - Regular / select columns: one column each with dropdown validation.
 * - Multi-select columns: expanded into one Yes/No column per option,
 *   grouped under a merged header row.
 * - Boolean columns: Yes/No dropdown.
 * - Dependent select columns: INDIRECT formula filtering based on parent column.
 */
export async function generateTemplate(
  config: BulkUploadConfig,
  lookups: LookupData,
  associations?: Record<string, AssociationMap>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(config.displayNamePlural, {
    properties: { defaultColWidth: 16 },
  });

  const hasMultiSelect = config.columns.some((c) => c.type === "multi-select");
  const dataStartRow = hasMultiSelect ? 3 : 2;

  // Hidden reference sheet for select dropdowns
  const { ranges: refRanges, nextCol: refNextCol, refSheet } =
    buildHiddenRefSheet(workbook, config, lookups);

  // ── Build column layout ─────────────────────────────────────────────────
  const layout: ColLayout[] = [];
  let excelCol = 1;

  for (const col of config.columns) {
    if (col.type === "multi-select") {
      const items = col.lookupKey ? (lookups[col.lookupKey] ?? []) : (col.options ?? []);
      if (items.length === 0) {
        // No options — fall back to single text column
        layout.push({ kind: "regular", col, excelCol });
        excelCol++;
      } else {
        for (const item of items) {
          layout.push({ kind: "option", col, optionLabel: item.label, excelCol });
          excelCol++;
        }
      }
    } else {
      layout.push({ kind: "regular", col, excelCol });
      excelCol++;
    }
  }

  // ── Build dependent dropdown setups ───────────────────────────────────
  const dependentSetups = new Map<string, DependentSetup>();
  if (associations && refSheet) {
    buildDependentDropdowns(
      workbook,
      refSheet,
      config,
      lookups,
      associations,
      refNextCol,
      layout,
      dependentSetups,
    );
  }

  // ── Style helpers ───────────────────────────────────────────────────────
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" }, // dark navy (slate-800)
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };
  const subHeaderFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B82F6" }, // medium blue (blue-500)
  };
  const subHeaderFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 10,
  };
  const centerAlign: Partial<ExcelJS.Alignment> = {
    vertical: "middle",
    horizontal: "center",
  };

  // ── Headers ─────────────────────────────────────────────────────────────
  if (hasMultiSelect) {
    // 2-row header: row 1 = group names (merged), row 2 = sub-headers
    const row1 = sheet.getRow(1);
    const row2 = sheet.getRow(2);
    row1.height = 28;
    row2.height = 24;

    // Track which config columns we've already written group headers for
    const groupsWritten = new Set<string>();

    for (const item of layout) {
      const c = item.excelCol;

      if (item.kind === "regular") {
        const label = item.col.required ? `${item.col.header} *` : item.col.header;

        // Merge row 1 and row 2 vertically for regular columns
        sheet.mergeCells(1, c, 2, c);
        const cell = sheet.getCell(1, c);
        cell.value = label;
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = centerAlign;
        cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };

        sheet.getColumn(c).width = item.col.excelWidth ?? 16;

        // Help text
        if (item.col.helpText) {
          cell.note = { texts: [{ text: item.col.helpText }] };
        }
      } else {
        // Option column — write group header once (merged horizontally)
        const groupKey = item.col.field;
        if (!groupsWritten.has(groupKey)) {
          groupsWritten.add(groupKey);

          // Find all option columns for this group
          const groupCols = layout.filter(
            (l) => l.kind === "option" && l.col.field === groupKey,
          );
          const startCol = groupCols[0].excelCol;
          const endCol = groupCols[groupCols.length - 1].excelCol;

          if (startCol === endCol) {
            // Single option — no merge needed
            const cell = sheet.getCell(1, startCol);
            cell.value = item.col.header;
            cell.font = headerFont;
            cell.fill = headerFill;
            cell.alignment = centerAlign;
          } else {
            sheet.mergeCells(1, startCol, 1, endCol);
            const cell = sheet.getCell(1, startCol);
            cell.value = item.col.header;
            cell.font = headerFont;
            cell.fill = headerFill;
            cell.alignment = centerAlign;
          }

          if (item.col.helpText) {
            sheet.getCell(1, startCol).note = {
              texts: [{ text: item.col.helpText }],
            };
          }
        }

        // Row 2: option name
        const subCell = sheet.getCell(2, c);
        subCell.value = item.optionLabel;
        subCell.font = subHeaderFont;
        subCell.fill = subHeaderFill;
        subCell.alignment = centerAlign;
        subCell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };

        sheet.getColumn(c).width = Math.max(item.optionLabel.length + 6, 28);
      }
    }
  } else {
    // Single-row header (no multi-select columns)
    const row1 = sheet.getRow(1);
    row1.height = 28;

    for (const item of layout) {
      if (item.kind !== "regular") continue;
      const c = item.excelCol;
      const label = item.col.required ? `${item.col.header} *` : item.col.header;
      const cell = sheet.getCell(1, c);
      cell.value = label;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = centerAlign;
      cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };

      sheet.getColumn(c).width = item.col.excelWidth ?? 16;

      if (item.col.helpText) {
        cell.note = { texts: [{ text: item.col.helpText }] };
      }
    }
  }

  // ── Data validation ─────────────────────────────────────────────────────
  const lastDataRow = dataStartRow + config.maxRows - 1;

  for (const item of layout) {
    const c = item.excelCol;

    if (item.kind === "option") {
      // Yes/No dropdown for each option sub-column
      for (let r = dataStartRow; r <= lastDataRow; r++) {
        sheet.getCell(r, c).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"Yes,No"'],
          showErrorMessage: true,
          errorTitle: "Invalid value",
          error: "Please select Yes or No.",
        };
      }
    } else {
      const col = item.col;

      if (col.type === "select") {
        const depSetup = dependentSetups.get(col.field);
        if (depSetup) {
          // Dependent dropdown — use INDIRECT formula per row
          for (let r = dataStartRow; r <= lastDataRow; r++) {
            sheet.getCell(r, c).dataValidation = {
              type: "list",
              allowBlank: !col.required,
              formulae: [depSetup.formula(r)],
              showErrorMessage: true,
              errorTitle: "Invalid value",
              error: "Please select a value from the dropdown.",
            };
          }
        } else {
          // Regular dropdown — static range reference
          const rangeRef = getDropdownRange(col, refRanges);
          if (rangeRef) {
            for (let r = dataStartRow; r <= lastDataRow; r++) {
              sheet.getCell(r, c).dataValidation = {
                type: "list",
                allowBlank: !col.required,
                formulae: [rangeRef],
                showErrorMessage: true,
                errorTitle: "Invalid value",
                error: "Please select a value from the dropdown.",
              };
            }
          }
        }
      }

      if (col.type === "boolean") {
        for (let r = dataStartRow; r <= lastDataRow; r++) {
          sheet.getCell(r, c).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: ['"Yes,No"'],
            showErrorMessage: true,
            errorTitle: "Invalid value",
            error: "Please select Yes or No.",
          };
        }
      }
    }
  }

  // ── Sample data ─────────────────────────────────────────────────────────
  if (config.sampleData) {
    for (const sample of config.sampleData) {
      const rowNum = sheet.lastRow ? sheet.lastRow.number + 1 : dataStartRow;
      const excelRow = sheet.getRow(rowNum);

      for (const item of layout) {
        let value: unknown = "";

        if (item.kind === "regular") {
          value = sample[item.col.field] ?? "";
        } else {
          // Check if this option is in the comma-separated sample value
          const raw = String(sample[item.col.field] ?? "");
          const selected = raw
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          value = selected.includes(item.optionLabel.toLowerCase()) ? "Yes" : "";
        }

        const cell = excelRow.getCell(item.excelCol);
        cell.value = value as ExcelJS.CellValue;
        cell.font = { italic: true, color: { argb: "FF9CA3AF" } };
      }
    }
  }

  // Freeze header rows
  sheet.views = [
    {
      state: "frozen",
      ySplit: hasMultiSelect ? 2 : 1,
      activeCell: `A${dataStartRow}`,
    },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a hidden reference sheet with dropdown values for select columns.
 * Multi-select columns don't need this (they use Yes/No sub-columns).
 *
 * Returns the range map, the next available column index, and the ref sheet
 * (so dependent dropdown builder can add data to it).
 */
function buildHiddenRefSheet(
  workbook: ExcelJS.Workbook,
  config: BulkUploadConfig,
  lookups: LookupData,
): { ranges: Map<string, string>; nextCol: number; refSheet: ExcelJS.Worksheet | null } {
  const ranges = new Map<string, string>();

  // Only select columns need dropdown ranges (not multi-select)
  const neededKeys = new Set<string>();
  const hasDependentCols = config.columns.some((c) => c.dependsOn);
  for (const col of config.columns) {
    if (col.type === "select") {
      if (col.lookupKey) neededKeys.add(col.lookupKey);
      else if (col.options && col.options.length > 0) {
        neededKeys.add(`_static_${col.field}`);
      }
    }
  }

  if (neededKeys.size === 0 && !hasDependentCols) {
    return { ranges, nextCol: 1, refSheet: null };
  }

  const refSheet = workbook.addWorksheet(REF_SHEET);
  refSheet.state = "veryHidden";

  let colOffset = 0;
  for (const key of neededKeys) {
    let items: { label: string }[];

    if (key.startsWith("_static_")) {
      const field = key.replace("_static_", "");
      const col = config.columns.find((c) => c.field === field);
      items = col?.options ?? [];
    } else {
      items = lookups[key] ?? [];
    }

    if (items.length === 0) continue;

    const excelColIdx = colOffset + 1;
    items.forEach((item, idx) => {
      refSheet.getCell(idx + 1, excelColIdx).value = item.label;
    });

    const colLetter = columnToLetter(excelColIdx);
    ranges.set(key, `'${REF_SHEET}'!$${colLetter}$1:$${colLetter}$${items.length}`);
    colOffset++;
  }

  return { ranges, nextCol: colOffset + 1, refSheet };
}

/**
 * Build dependent dropdown named ranges and lookup mapping on the ref sheet.
 *
 * For each dependent column (e.g. Brand depends on Sub Category):
 * 1. Write parent labels in a ref column, and the corresponding named-range
 *    name strings in an adjacent column.
 * 2. Create a named range for each parent's associated child values.
 * 3. Create a fallback named range with ALL child values.
 * 4. Store a formula builder that uses INDIRECT + INDEX + MATCH so the
 *    dropdown filters based on what the user selects in the parent column.
 */
function buildDependentDropdowns(
  workbook: ExcelJS.Workbook,
  refSheet: ExcelJS.Worksheet,
  config: BulkUploadConfig,
  lookups: LookupData,
  associations: Record<string, AssociationMap>,
  startCol: number,
  layout: ColLayout[],
  out: Map<string, DependentSetup>,
): void {
  let col = startCol;

  for (const colDef of config.columns) {
    if (!colDef.dependsOn) continue;

    const assocData = associations[colDef.dependsOn.associationKey];
    if (!assocData) continue;

    // Find the parent column's Excel position
    const parentItem = layout.find(
      (l) => l.kind === "regular" && l.col.field === colDef.dependsOn!.parentField,
    );
    if (!parentItem) continue;

    const parentColLetter = columnToLetter(parentItem.excelCol);
    const parentLabels = Object.keys(assocData);

    // ── Mapping columns: parent label → named range name ──────────────
    const labelColIdx = col++;
    const nameColIdx = col++;

    for (let i = 0; i < parentLabels.length; i++) {
      const label = parentLabels[i];
      const rangeName = sanitizeForNamedRange(label);
      refSheet.getCell(i + 1, labelColIdx).value = label;
      refSheet.getCell(i + 1, nameColIdx).value = rangeName;
    }

    // ── Named range per parent ────────────────────────────────────────
    for (const parentLabel of parentLabels) {
      const children = assocData[parentLabel];
      if (children.length === 0) continue;

      const rangeName = sanitizeForNamedRange(parentLabel);
      const dataColIdx = col++;

      for (let i = 0; i < children.length; i++) {
        refSheet.getCell(i + 1, dataColIdx).value = children[i];
      }

      const letter = columnToLetter(dataColIdx);
      workbook.definedNames.add(
        `'${REF_SHEET}'!$${letter}$1:$${letter}$${children.length}`,
        rangeName,
      );
    }

    // ── Fallback "all" named range ────────────────────────────────────
    const allChildren = lookups[colDef.lookupKey!] ?? [];
    const allName = `_all_${sanitizeForNamedRange(colDef.field)}`;
    const allColIdx = col++;

    for (let i = 0; i < allChildren.length; i++) {
      refSheet.getCell(i + 1, allColIdx).value = allChildren[i].label;
    }

    const allLetter = columnToLetter(allColIdx);
    workbook.definedNames.add(
      `'${REF_SHEET}'!$${allLetter}$1:$${allLetter}$${allChildren.length}`,
      allName,
    );

    // ── Build INDIRECT formula ────────────────────────────────────────
    // INDEX/MATCH converts the parent cell text → the named range name
    // INDIRECT resolves it to the actual cell range for the dropdown
    const labelLetter = columnToLetter(labelColIdx);
    const nameLetter = columnToLetter(nameColIdx);
    const labelRange = `'${REF_SHEET}'!$${labelLetter}$1:$${labelLetter}$${parentLabels.length}`;
    const nameRange = `'${REF_SHEET}'!$${nameLetter}$1:$${nameLetter}$${parentLabels.length}`;

    out.set(colDef.field, {
      formula: (row: number) =>
        `INDIRECT(IF($${parentColLetter}${row}="","${allName}",IFERROR(INDEX(${nameRange},MATCH($${parentColLetter}${row},${labelRange},0)),"${allName}")))`,
    });
  }
}

/** Convert a label to a valid Excel named range name */
function sanitizeForNamedRange(name: string): string {
  let result = name.replace(/[^a-zA-Z0-9]/g, "_");
  // Named ranges cannot start with a digit
  if (/^[0-9]/.test(result)) result = "_" + result;
  // Prefix to avoid conflicts with built-in names
  return "_d_" + result;
}

function getDropdownRange(
  col: { lookupKey?: string; options?: { label: string }[]; field: string },
  refRanges: Map<string, string>,
): string | null {
  if (col.lookupKey) return refRanges.get(col.lookupKey) ?? null;
  if (col.options && col.options.length > 0) {
    return refRanges.get(`_static_${col.field}`) ?? null;
  }
  return null;
}

function columnToLetter(col: number): string {
  let result = "";
  let n = col;
  while (n > 0) {
    n--;
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}
