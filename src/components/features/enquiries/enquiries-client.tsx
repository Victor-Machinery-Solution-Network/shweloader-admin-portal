"use client";

import { useCallback, useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { useHasPermission } from "@/hooks/use-permissions";
import {
  ExportExcelButton,
  type ExportColumn,
} from "@/components/shared/export-excel-button";
import type { FilterConfig } from "@/types/data-table-filters";
import { formatDate } from "@/lib/utils";
import { getEnquiryColumns } from "./columns";
import type {
  EnquiryWithDetails,
  EnquiryStatusType,
} from "@/types/enquiry";
import type { BusinessType } from "@/types/app-user";

interface EnquiriesClientProps {
  enquiries: EnquiryWithDetails[];
  statusTypes: EnquiryStatusType[];
  businessTypes: BusinessType[];
}

// Excel template shape — splits stacked on-screen cells into separate sheet
// columns and adds report-friendly formatting (Sale/Rental, formatted date).
// MMK Price / USD Price are emitted as raw numbers (not formatted strings)
// so Excel can SUM/FILTER them. The rental unit (per_day / per_week / etc) is
// shipped as its own column when applicable.
const EXPORT_COLUMNS: ExportColumn[] = [
  { key: "no", header: "No." },
  { key: "inquiry_date", header: "Inquiry Date" },
  { key: "account_name", header: "Account Name" },
  { key: "user_name", header: "User Name" },
  { key: "contact_number", header: "Contact Number" },
  { key: "email", header: "Email" },
  { key: "location", header: "Location" },
  { key: "product_type", header: "Product Type" },
  { key: "rental_unit", header: "Rental Unit" },
  { key: "product_code", header: "Product Code" },
  { key: "brand", header: "Brand" },
  { key: "model", header: "Model" },
  { key: "mmk_price", header: "MMK Price" },
  { key: "usd_price", header: "USD Price" },
  { key: "partner_account", header: "Partner Account (Owner Account)" },
  { key: "partner_username", header: "Partner Username (Owner Account)" },
  { key: "status", header: "Status" },
  { key: "notes", header: "Notes" },
];

// Format the rental_unit value for export ("per_day" → "per day"). Blank for
// sale enquiries or when the unit is missing.
function formatRentalUnit(
  productType: string | null,
  rentalUnit: string | null,
): string {
  if (productType !== "rent" || !rentalUnit) return "";
  return rentalUnit.replace(/^per_/, "").replace(/_/g, " ");
}

export function EnquiriesClient({
  enquiries,
  statusTypes,
  businessTypes,
}: EnquiriesClientProps) {
  const canExport = useHasPermission("enquiries", "export");

  const businessTypeMap = useMemo(
    () =>
      new Map(
        businessTypes.map((bt) => [
          bt.business_type_id,
          { name: bt.name, isListed: bt.is_listed === 1 },
        ]),
      ),
    [businessTypes],
  );

  const columns = useMemo(
    () => getEnquiryColumns(statusTypes, businessTypeMap),
    [statusTypes, businessTypeMap],
  );

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "status_name",
        label: "Status",
        type: "multi-select",
        options: statusTypes.map((s) => ({
          label: s.status_name,
          value: s.status_name,
        })),
      },
      {
        columnId: "product_type",
        label: "Product Type",
        type: "multi-select",
        options: [
          { label: "Sale", value: "sale" },
          { label: "Rental", value: "rent" },
        ],
      },
      { columnId: "brand_name", label: "Brand", type: "multi-select" },
      { columnId: "partner_username", label: "Partner", type: "multi-select" },
      { columnId: "enquired_at", label: "Inquiry Date", type: "date-range" },
    ],
    [statusTypes],
  );

  const getExportData = useCallback(
    () =>
      enquiries.map((e, i) => ({
        no: i + 1,
        inquiry_date: formatDate(e.enquired_at),
        account_name: e.user_name ?? "",
        user_name: e.user_username,
        contact_number: e.user_phone,
        email: e.user_email ?? "",
        location: e.user_location ?? "",
        product_type: e.product_type === "sale" ? "Sale" : "Rental",
        rental_unit: formatRentalUnit(e.product_type, e.rental_unit),
        product_code: e.product_code ?? "",
        brand: e.brand_name ?? "",
        model: e.model_name ?? "",
        // Raw numbers so Excel treats these as numeric (SUM / FILTER work).
        // Empty string stays blank in the cell.
        mmk_price: e.mmk_price ?? "",
        usd_price: e.usd_price ?? "",
        partner_account: e.partner_name ?? "",
        partner_username: e.partner_username ?? "",
        status: e.close_outcome
          ? `${e.status_name} (${e.close_outcome})`
          : e.status_name,
        notes: e.notes ?? "",
      })),
    [enquiries],
  );

  if (enquiries.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No enquiries yet"
        description="Product enquiries from users will appear here once they message about a listing."
        fullPage={false}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={enquiries}
      searchKeys={[
        "user_username",
        "user_email",
        "user_phone",
        "product_code",
        "model_name",
        "partner_username",
      ]}
      searchPlaceholder="Search enquiries"
      filterConfig={filterConfig}
      filterStorageKey="enquiries-filters"
      enablePagination
      pageSize={20}
      toolbar={
        canExport ? (
          <ExportExcelButton
            fileName="enquiries"
            getColumns={() => EXPORT_COLUMNS}
            getData={getExportData}
          />
        ) : undefined
      }
    />
  );
}
