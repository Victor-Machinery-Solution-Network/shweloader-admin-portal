"use client";

import { useState, useCallback } from "react";
import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { BusinessTypeForm } from "./business-type-form";
import { columns } from "./columns";
import {
  deleteBusinessTypes,
  getCustomerCount,
} from "@/lib/actions/business-type";
import type { BusinessType } from "@/types/customer";

interface BusinessTypesClientProps {
  businessTypes: BusinessType[];
}

export function BusinessTypesClient({
  businessTypes,
}: BusinessTypesClientProps) {
  const [showCreate, setShowCreate] = useState(false);

  const buildDescription = useCallback(
    async (selected: BusinessType[]) => {
      const ids = selected.map((bt) => bt.business_type_id);
      const counts = await getCustomerCount(ids);
      const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

      const names = selected.map((bt) => `"${bt.name}"`).join(", ");
      let msg = `This will permanently delete ${selected.length === 1 ? names : `${selected.length} business types (${names})`}.`;

      if (totalLinked > 0) {
        msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "customer" : "customers"} using ${selected.length === 1 ? "this business type" : "these business types"}.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: BusinessType[]) => {
      const ids = selected.map((bt) => bt.business_type_id);
      return deleteBusinessTypes(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: BusinessType[]) => (
      <BulkDeleteButton
        selectedRows={selected}
        onDelete={handleBulkDelete}
        buildDescription={buildDescription}
        itemLabel="business type"
      />
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>
          <Plus /> Add Business Type
        </Button>
      </div>

      {businessTypes.length > 0 ? (
        <DataTable
          columns={columns}
          data={businessTypes}
          searchKey="name"
          searchPlaceholder="Search business types…"
          enableSelection
          enablePagination
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Briefcase}
          title="No business types yet"
          description="Get started by creating your first business type."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Business Type
            </Button>
          }
        />
      )}

      <BusinessTypeForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
