"use client";

import { useState, useCallback } from "react";
import { Handshake, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { PartnerTypeForm } from "./partner-type-form";
import { columns, type PartnerTypeRow } from "./columns";
import {
  deletePartnerTypes,
  getPartnerCountByType,
} from "@/lib/actions/partner-type";

interface PartnerTypesClientProps {
  partnerTypes: PartnerTypeRow[];
}

export function PartnerTypesClient({ partnerTypes }: PartnerTypesClientProps) {
  const canCreate = useHasPermission("partners", "create");
  const canExport = useHasPermission("partners", "export");
  const canDelete = useHasPermission("partners", "delete");
  const [showCreate, setShowCreate] = useState(false);

  const buildDescription = useCallback(async (selected: PartnerTypeRow[]) => {
    const ids = selected.map((pt) => pt.id);
    const counts = await getPartnerCountByType(ids);
    const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

    const names = selected.map((pt) => `"${pt.name}"`).join(", ");
    let msg = `${selected.length === 1 ? names : `${selected.length} partner types (${names})`} will be moved to the trash.`;

    if (totalLinked > 0) {
      msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "partner" : "partners"} using ${selected.length === 1 ? "this type" : "these types"}.`;
    }

    return msg;
  }, []);

  const handleBulkDelete = useCallback(async (selected: PartnerTypeRow[]) => {
    const ids = selected.map((pt) => pt.id);
    return deletePartnerTypes(ids);
  }, []);

  const renderToolbar = useCallback(
    (selected: PartnerTypeRow[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="partner type"
          />
        )}
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus /> Add Partner Type
          </Button>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canDelete, canCreate],
  );

  return (
    <>
      {partnerTypes.length > 0 ? (
        <DataTable
          columns={columns}
          data={partnerTypes}
          searchKeys={["name"]}
          searchPlaceholder="Search partner types"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.id}
          toolbar={renderToolbar}
          enableExport={canExport}
          exportFileName="partner-types"
        />
      ) : (
        <EmptyState
          icon={Handshake}
          title="No partner types yet"
          description="Get started by creating your first partner type."
          action={
            canCreate ? (
              <Button onClick={() => setShowCreate(true)}>
                <Plus /> Add Partner Type
              </Button>
            ) : undefined
          }
        />
      )}

      <PartnerTypeForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
