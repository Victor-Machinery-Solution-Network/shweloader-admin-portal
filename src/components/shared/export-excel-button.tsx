"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { exportToExcel, type ExportColumn } from "@/lib/export-excel";

export type { ExportColumn };

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
      await exportToExcel(columns, data, fileName);
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
