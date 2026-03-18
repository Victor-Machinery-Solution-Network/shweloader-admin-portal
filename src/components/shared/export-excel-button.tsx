"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export interface ExportColumn {
  /** Column key / accessor */
  key: string;
  /** Display header for Excel */
  header: string;
}

interface ExportExcelButtonProps {
  /** Getter for filtered data rows — called at click time so titles are fresh */
  getData: () => Record<string, unknown>[];
  /** Getter for column definitions — called at click time */
  getColumns: () => ExportColumn[];
  /** File name (without extension) */
  fileName?: string;
}

export function ExportExcelButton({
  getData,
  getColumns,
  fileName = "export",
}: ExportExcelButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    const columns = getColumns();
    const data = getData();

    if (data.length === 0) {
      toast.info("No data to export");
      return;
    }

    setExporting(true);
    try {
      // Dynamic import to keep ExcelJS out of the initial bundle
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Data");

      // Header row
      sheet.columns = columns.map((col) => ({
        header: col.header,
        key: col.key,
        width: Math.max(col.header.length + 4, 15),
      }));

      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };

      // Data rows
      for (const row of data) {
        const values: Record<string, unknown> = {};
        for (const col of columns) {
          const val = row[col.key];
          // Normalize values for Excel
          values[col.key] =
            val === null || val === undefined ? "" : val;
        }
        sheet.addRow(values);
      }

      // Auto-fit column widths based on content (approximate)
      for (const col of sheet.columns) {
        if (!col.eachCell) continue;
        let maxLength = (col.header as string)?.length ?? 10;
        col.eachCell({ includeEmpty: false }, (cell) => {
          const len = String(cell.value ?? "").length;
          if (len > maxLength) maxLength = len;
        });
        col.width = Math.min(maxLength + 2, 50);
      }

      // Generate and download
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

      toast.success(`Exported ${data.length} rows`);
    } catch {
      toast.error("Failed to export");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting}
    >
      {exporting ? <Spinner className="mr-1" /> : <Download className="size-4" />}
      Export
    </Button>
  );
}
