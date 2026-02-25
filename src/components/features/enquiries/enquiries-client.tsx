"use client";

import { useMemo, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { createEnquiryColumns } from "./columns";
import { deleteEnquiries } from "@/lib/actions/enquiry";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";
import type { FilterConfig } from "@/types/data-table-filters";

interface EnquiriesClientProps {
  enquiries: EnquiryWithDetails[];
  statusTypes: EnquiryStatusType[];
}

export function EnquiriesClient({
  enquiries,
  statusTypes,
}: EnquiriesClientProps) {
  const canDelete = useHasPermission("enquiries", "delete");
  const columns = useMemo(
    () => createEnquiryColumns(statusTypes),
    [statusTypes],
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
        columnId: "listing_type",
        label: "Listing Type",
        type: "multi-select",
        options: [
          { label: "For Sale", value: "sale" },
          { label: "For Rent", value: "rent" },
        ],
      },
      { columnId: "created_at", label: "Date", type: "date-range" },
    ],
    [statusTypes],
  );

  async function handleBulkDelete(rows: EnquiryWithDetails[]) {
    const ids = rows.map((r) => r.id);
    return deleteEnquiries(ids);
  }

  const renderToolbar = useCallback(
    (selected: EnquiryWithDetails[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            itemLabel="enquiry"
          />
        )}
      </>
    ),
    [canDelete],
  );

  return enquiries.length > 0 ? (
    <DataTable
      columns={columns}
      data={enquiries}
      searchKeys={["user_name", "user_email", "user_company", "model_name", "message"]}
      searchPlaceholder="Search enquiries"
      filterConfig={filterConfig}
      filterStorageKey="enquiries-filters"
      initialColumnVisibility={{ listing_type: false }}
      enablePagination
      pageSize={10}
      enableSelection
      getRowId={(row) => row.id}
      toolbar={renderToolbar}
    />
  ) : (
    <EmptyState
      icon={MessageSquare}
      title="No enquiries yet"
      description="User enquiries will appear here."
    />
  );
}
