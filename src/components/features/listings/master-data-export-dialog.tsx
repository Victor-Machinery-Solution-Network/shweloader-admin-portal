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
  // Product info
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
  // Equipment Location
  { key: "detail_address", header: "Detail Address" },
  { key: "township", header: "Township" },
  { key: "district", header: "District" },
  { key: "region_state", header: "Region/State" },
  // Pricing & listing
  { key: "license_status", header: "License Status" },
  { key: "price_mmk", header: "Price (MMK)" },
  { key: "price_usd", header: "Price (USD)" },
  { key: "fx_rate", header: "Ref - Fx-rate" },
  { key: "listing_type", header: "Listing Type" },
  { key: "product_type", header: "Product Type" },
  // Seller / Partner Information
  { key: "partner_type", header: "Partner Type" },
  { key: "business_type", header: "Business Type" },
  { key: "company_name", header: "Company Name" },
  { key: "contact_person", header: "Contact Person" },
  { key: "second_contact_person", header: "Second Contact Person" },
  { key: "contact_no", header: "Contact No." },
  { key: "email", header: "Email" },
  // Seller Address
  { key: "seller_address", header: "Detail Address (Seller)" },
  { key: "seller_township", header: "Township (Seller)" },
  { key: "seller_district", header: "District (Seller)" },
  { key: "seller_region_state", header: "Region/State (Seller)" },
];

/**
 * Format a price value with thousand separators for the export file only
 * (e.g. 100000 → "100,000"). Leaves blanks empty and passes through any
 * non-numeric value (e.g. an already-formatted string) untouched.
 */
function formatPrice(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return "";
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n.toLocaleString("en-US") : value;
}

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
      // Comma-separate the price columns in the generated file only.
      const exportRows = (rows as unknown as Record<string, unknown>[]).map(
        (row) => ({
          ...row,
          price_mmk: formatPrice(row.price_mmk),
          price_usd: formatPrice(row.price_usd),
        }),
      );
      await exportToExcel(COLUMNS, exportRows, "master-data");
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
