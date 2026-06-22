export interface ExportColumn {
  /** Column key / accessor on each row object */
  key: string;
  /** Display header for Excel */
  header: string;
}

/**
 * Build an .xlsx from columns + rows and trigger a browser download.
 * Shared by the table Export button and the master-data export.
 * ExcelJS is dynamically imported so it stays out of the initial bundle.
 * Returns the number of rows written.
 */
export async function exportToExcel(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  fileName: string,
): Promise<number> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.max(col.header.length + 4, 15),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  // Neutralize Excel formula-injection on string values (a stored field
  // starting with = + - @ tab/CR is evaluated as a formula on open). Numbers
  // pass through so SUM/FILTER still work.
  const sanitize = (val: unknown): unknown => {
    if (val === null || val === undefined) return "";
    if (typeof val !== "string") return val;
    return /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
  };

  for (const row of rows) {
    const values: Record<string, unknown> = {};
    for (const col of columns) values[col.key] = sanitize(row[col.key]);
    sheet.addRow(values);
  }

  for (const col of sheet.columns) {
    if (!col.eachCell) continue;
    let maxLength = (col.header as string)?.length ?? 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLength) maxLength = len;
    });
    col.width = Math.min(maxLength + 2, 50);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return rows.length;
}
