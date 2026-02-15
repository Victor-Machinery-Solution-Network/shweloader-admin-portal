"use client";

import { useMemo, useState, useCallback } from "react";
import { MessageSquare, Clock, CheckCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createEnquiryColumns } from "./columns";
import { deleteEnquiries } from "@/lib/actions/enquiry";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

interface EnquiriesClientProps {
  enquiries: EnquiryWithDetails[];
  statusTypes: EnquiryStatusType[];
}

export function EnquiriesClient({
  enquiries,
  statusTypes,
}: EnquiriesClientProps) {
  const [tab, setTab] = useState<"all" | "pending" | "resolved">("all");

  const columns = useMemo(
    () => createEnquiryColumns(statusTypes),
    [statusTypes],
  );

  const pendingEnquiries = useMemo(
    () => enquiries.filter((e) => e.status_name === "Pending"),
    [enquiries],
  );

  const resolvedEnquiries = useMemo(
    () => enquiries.filter((e) => e.status_name === "Resolved"),
    [enquiries],
  );

  const pendingCount = pendingEnquiries.length;

  const currentData =
    tab === "pending"
      ? pendingEnquiries
      : tab === "resolved"
        ? resolvedEnquiries
        : enquiries;

  async function handleBulkDelete(rows: EnquiryWithDetails[]) {
    const ids = rows.map((r) => r.id);
    return deleteEnquiries(ids);
  }

  const renderToolbar = useCallback(
    (selected: EnquiryWithDetails[]) => (
      <BulkDeleteButton
        selectedRows={selected}
        onDelete={handleBulkDelete}
        itemLabel="enquiry"
      />
    ),
    [],
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as typeof tab)}
    >
      <TabsList>
        <TabsTrigger value="all">
          <MessageSquare className="size-4" aria-hidden="true" />
          All Enquiries
        </TabsTrigger>
        <TabsTrigger value="pending">
          <Clock className="size-4" aria-hidden="true" />
          Pending
          {pendingCount > 0 && (
            <Badge
              variant="outline"
              className="ml-1 size-5 justify-center border-blue-200 bg-blue-50 p-0 tabular-nums text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
            >
              {pendingCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="resolved">
          <CheckCircle className="size-4" aria-hidden="true" />
          Resolved
        </TabsTrigger>
      </TabsList>

      <TabsContent value={tab}>
        {currentData.length > 0 ? (
          <DataTable
            columns={columns}
            data={currentData}
            searchKey="customer_name"
            searchPlaceholder="Search by customer"
            enablePagination
            pageSize={10}
            enableSelection
            getRowId={(row) => row.id}
            toolbar={renderToolbar}
          />
        ) : (
          <EmptyState
            icon={
              tab === "pending"
                ? Clock
                : tab === "resolved"
                  ? CheckCircle
                  : MessageSquare
            }
            title={
              tab === "pending"
                ? "No pending enquiries"
                : tab === "resolved"
                  ? "No resolved enquiries"
                  : "No enquiries yet"
            }
            description={
              tab === "pending"
                ? "All enquiries have been resolved."
                : tab === "resolved"
                  ? "No enquiries have been resolved yet."
                  : "Customer enquiries will appear here."
            }
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
