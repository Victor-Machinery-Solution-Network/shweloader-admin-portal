"use client";

import { useMemo, useState } from "react";
import { LayoutList, Handshake, Tags, Clock, ShieldX, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabCount } from "@/components/ui/tabs";
import { allColumns, approvedColumns, pendingColumns, rejectedColumns } from "./columns";
import { AddPartnerDialog } from "./add-partner-dialog";
import { PartnerTypesClient } from "@/components/features/partner-types/partner-types-client";
import type { PartnerWithDetails } from "@/types/partner";
import type { AppUser } from "@/types/app-user";

interface PartnersClientProps {
  partners: PartnerWithDetails[];
  partnerTypes: { id: number; name: string }[];
  initialUsers: AppUser[];
}

export function PartnersClient({
  partners,
  partnerTypes,
  initialUsers,
}: PartnersClientProps) {
  const canApprove = useHasPermission("partners", "approve");
  const [showAddPartner, setShowAddPartner] = useState(false);
  const allCols = useMemo(() => allColumns(partnerTypes), [partnerTypes]);
  const approvedCols = useMemo(
    () => approvedColumns(partnerTypes),
    [partnerTypes],
  );
  const pendingCols = useMemo(
    () => pendingColumns(partnerTypes),
    [partnerTypes],
  );
  const rejectedCols = useMemo(
    () => rejectedColumns(partnerTypes),
    [partnerTypes],
  );

  const addPartnerButton = canApprove ? (
    <Button onClick={() => setShowAddPartner(true)} className="ml-auto">
      <Plus /> Add Partner
    </Button>
  ) : undefined;
  const approvedPartners = useMemo(
    () => partners.filter((p) => p.status_name?.toLowerCase() === "approved"),
    [partners],
  );

  const pendingPartners = useMemo(
    () => partners.filter((p) => p.status_name?.toLowerCase() === "pending"),
    [partners],
  );

  const rejectedPartners = useMemo(
    () => partners.filter((p) => p.status_name?.toLowerCase() === "rejected"),
    [partners],
  );

  const pendingCount = pendingPartners.length;

  const allFilterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "status_name",
        label: "Status",
        type: "multi-select",
        options: [
          { label: "Approved", value: "Approved" },
          { label: "Pending", value: "Pending" },
          { label: "Rejected", value: "Rejected" },
        ],
      },
      { columnId: "business", label: "Business Type", type: "multi-select" },
      { columnId: "partner_type_name", label: "Partner Type", type: "multi-select" },
      { columnId: "applied_at", label: "Applied", type: "date-range" },
    ],
    [],
  );

  const approvedFilterConfig = useMemo<FilterConfig[]>(
    () => [
      { columnId: "business", label: "Business Type", type: "multi-select" },
      { columnId: "partner_type_name", label: "Partner Type", type: "multi-select" },
      { columnId: "reviewed_at", label: "Approved", type: "date-range" },
    ],
    [],
  );

  const pendingFilterConfig = useMemo<FilterConfig[]>(
    () => [
      { columnId: "business", label: "Business Type", type: "multi-select" },
      { columnId: "partner_type_name", label: "Partner Type", type: "multi-select" },
      { columnId: "applied_at", label: "Applied", type: "date-range" },
    ],
    [],
  );

  const rejectedFilterConfig = useMemo<FilterConfig[]>(
    () => [
      { columnId: "partner_type_name", label: "Partner Type", type: "multi-select" },
      { columnId: "applied_at", label: "Applied", type: "date-range" },
      { columnId: "reviewed_at", label: "Rejected", type: "date-range" },
    ],
    [],
  );

  return (
    <>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            <LayoutList className="size-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="partners">
            <Handshake className="size-4" />
            Partners
          </TabsTrigger>
          <TabsTrigger value="partner-types">
            <Tags className="size-4" />
            Partner Types
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="size-4" />
            Pending
            {pendingCount > 0 && (
              <TabCount>{pendingCount}</TabCount>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <ShieldX className="size-4" />
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {partners.length > 0 ? (
            <DataTable
              columns={allCols}
              data={partners}
              searchKeys={["user_name", "user_email", "user_company", "user_phone"]}
              searchPlaceholder="Search all partners"
              filterConfig={allFilterConfig}
              filterStorageKey="partners-all-filters"
              enablePagination
              pageSize={10}
              enableExport
              exportFileName="partners-all"
              toolbar={addPartnerButton}
            />
          ) : (
            <EmptyState
              icon={LayoutList}
              title="No partners yet"
              description="Partner applications will appear here."
              fullPage={false}
              action={addPartnerButton}
            />
          )}
        </TabsContent>

        <TabsContent value="partners">
          {approvedPartners.length > 0 ? (
            <DataTable
              columns={approvedCols}
              data={approvedPartners}
              searchKeys={["user_name", "user_email", "user_company", "user_phone"]}
              searchPlaceholder="Search partners"
              filterConfig={approvedFilterConfig}
              filterStorageKey="partners-approved-filters"
              enablePagination
              pageSize={10}
              enableExport
              exportFileName="partners-approved"
              toolbar={addPartnerButton}
            />
          ) : (
            <EmptyState
              icon={Handshake}
              title="No approved partners yet"
              description="Approved partners will appear here."
              fullPage={false}
              action={addPartnerButton}
            />
          )}
        </TabsContent>

        <TabsContent value="partner-types">
          <PartnerTypesClient partnerTypes={partnerTypes} />
        </TabsContent>

        <TabsContent value="pending">
          {pendingPartners.length > 0 ? (
            <DataTable
              columns={pendingCols}
              data={pendingPartners}
              searchKeys={["user_name", "user_email", "user_company", "user_phone"]}
              searchPlaceholder="Search pending applications"
              filterConfig={pendingFilterConfig}
              filterStorageKey="partners-pending-filters"
              enablePagination
              pageSize={10}
              enableExport
              exportFileName="partners-pending"
            />
          ) : (
            <EmptyState
              icon={Clock}
              title="No pending applications"
              description="All partner applications have been reviewed."
              fullPage={false}
            />
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedPartners.length > 0 ? (
            <DataTable
              columns={rejectedCols}
              data={rejectedPartners}
              searchKeys={["user_name", "user_email", "user_company", "user_phone"]}
              searchPlaceholder="Search rejected applications"
              filterConfig={rejectedFilterConfig}
              filterStorageKey="partners-rejected-filters"
              enablePagination
              pageSize={10}
              enableExport
              exportFileName="partners-rejected"
            />
          ) : (
            <EmptyState
              icon={ShieldX}
              title="No rejected applications"
              description="Rejected partner applications will appear here."
              fullPage={false}
            />
          )}
        </TabsContent>
      </Tabs>

      <AddPartnerDialog
        open={showAddPartner}
        onOpenChange={setShowAddPartner}
        partnerTypes={partnerTypes}
        initialUsers={initialUsers}
      />
    </>
  );
}
