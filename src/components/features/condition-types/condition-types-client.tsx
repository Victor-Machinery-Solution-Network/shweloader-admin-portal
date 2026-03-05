"use client";

import { useState, useCallback } from "react";
import { ListChecks, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { ConditionTypeForm } from "./condition-type-form";
import { columns } from "./columns";
import {
  deleteConditionTypes,
  getListingCountByCondition,
} from "@/lib/actions/condition-type";
import type { ConditionType } from "@/types/listing";

interface ConditionTypesClientProps {
  conditionTypes: ConditionType[];
}

export function ConditionTypesClient({
  conditionTypes,
}: ConditionTypesClientProps) {
  const canCreate = useHasPermission("condition_types", "create");
  const canDelete = useHasPermission("condition_types", "delete");
  const [showCreate, setShowCreate] = useState(false);

  const buildDescription = useCallback(
    async (selected: ConditionType[]) => {
      const ids = selected.map((ct) => ct.id);
      const counts = await getListingCountByCondition(ids);
      const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

      const names = selected.map((ct) => `"${ct.name}"`).join(", ");
      let msg = `${selected.length === 1 ? names : `${selected.length} conditions (${names})`} will be permanently deleted.`;

      if (totalLinked > 0) {
        msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "listing" : "listings"} using ${selected.length === 1 ? "this condition" : "these conditions"}.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: ConditionType[]) => {
      const ids = selected.map((ct) => ct.id);
      return deleteConditionTypes(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: ConditionType[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="condition"
          />
        )}
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus /> Add Condition
          </Button>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canDelete, canCreate],
  );

  return (
    <>
      {conditionTypes.length > 0 ? (
        <DataTable
          columns={columns}
          data={conditionTypes}
          searchKeys={["name"]}
          searchPlaceholder="Search conditions"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.id}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={ListChecks}
          title="No sale conditions yet"
          description="Get started by creating your first sale condition."
          action={
            canCreate ? (
              <Button onClick={() => setShowCreate(true)}>
                <Plus /> Add Condition
              </Button>
            ) : undefined
          }
        />
      )}

      <ConditionTypeForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
