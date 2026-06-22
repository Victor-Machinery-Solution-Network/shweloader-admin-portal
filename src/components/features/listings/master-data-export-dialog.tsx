"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { exportToExcel, type ExportColumn } from "@/lib/export-excel";
import { getMasterDataExport } from "@/lib/actions/listing";

// Fixed sheet layout (matches the requested master-data format, left→right).
const COLUMNS: ExportColumn[] = [
  { key: "no", header: "No." },
  { key: "admin_pic", header: "Admin - PIC" },
  { key: "data_entry_date", header: "Data Entry Date" },
  { key: "product_code", header: "Product Code" },
  { key: "main_category", header: "Main Category" },
  { key: "sub_category", header: "Sub Category" },
  { key: "product_description", header: "Product Description" },
  { key: "brand", header: "Brand" },
  { key: "model", header: "Model" },
  { key: "operating_weight", header: "Operating Weight" },
  { key: "condition", header: "Condition" },
  { key: "manufactured_year", header: "Manufactured Year" },
  { key: "machine_hours", header: "Machine Hours" },
  { key: "detail_address", header: "Detail Address" },
  { key: "township", header: "Township" },
  { key: "district", header: "District" },
];

export function MasterDataExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const rows = await getMasterDataExport();
      if (rows.length === 0) {
        toast.info("No listings to export");
        onOpenChange(false);
        return;
      }
      await exportToExcel(
        COLUMNS,
        rows as unknown as Record<string, unknown>[],
        "master-data",
      );
      toast.success(`Exported ${rows.length} listings`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to export master data");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export master data?</DialogTitle>
          <DialogDescription>
            Download all active listings (sale &amp; rent) as an Excel file.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={busy}>
            {busy ? (
              <>
                <Spinner className="mr-1" /> Exporting…
              </>
            ) : (
              "Yes, export"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
