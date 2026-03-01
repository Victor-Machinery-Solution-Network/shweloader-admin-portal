"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { DistrictForm } from "./district-form";
import { deleteDistrict } from "@/lib/actions/location";
import type { DistrictWithParent, StateRegion } from "@/types/location";

interface DistrictRowActionsProps {
  district: DistrictWithParent;
  linkedCount: number;
  stateRegions: StateRegion[];
}

export function DistrictRowActions({ district, linkedCount, stateRegions }: DistrictRowActionsProps) {
  const canEdit = useHasPermission("locations", "edit");
  const canDelete = useHasPermission("locations", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDistrict(district.district_id);
      if (result.success) {
        toast.success("District deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deleteDescription =
    linkedCount > 0
      ? <><strong>&ldquo;{district.name}&rdquo;</strong> ({district.state_region_name}) will be moved to the trash.<br />There {linkedCount === 1 ? "is" : "are"} <strong>{linkedCount}</strong> {linkedCount === 1 ? "township" : "townships"} under this district that will also be deleted (cascade).</>
      : <><strong>&ldquo;{district.name}&rdquo;</strong> ({district.state_region_name}) will be moved to the trash.<br />You can restore it within 30 days.</>;

  const actions = [
    ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: () => setShowEdit(true) }] : []),
    ...(canDelete ? [{ label: "Delete" as const, icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" as const }] : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

      {showEdit && (
        <DistrictForm
          open={showEdit}
          onOpenChange={setShowEdit}
          district={district}
          stateRegions={stateRegions}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete district?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
