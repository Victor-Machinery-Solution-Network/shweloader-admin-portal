"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { StateRegionForm } from "./state-region-form";
import { deleteStateRegion } from "@/lib/actions/location";
import type { StateRegion } from "@/types/location";

interface StateRegionRowActionsProps {
  stateRegion: StateRegion;
  linkedCount: number;
}

export function StateRegionRowActions({ stateRegion, linkedCount }: StateRegionRowActionsProps) {
  const canEdit = useHasPermission("locations", "edit");
  const canDelete = useHasPermission("locations", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteStateRegion(stateRegion.state_region_id);
      if (result.success) {
        toast.success("State/Region deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deleteDescription =
    linkedCount > 0
      ? <><strong>&ldquo;{stateRegion.name}&rdquo;</strong> will be moved to the trash.<br />There {linkedCount === 1 ? "is" : "are"} <strong>{linkedCount}</strong> {linkedCount === 1 ? "district" : "districts"} under this state/region that will also be deleted (cascade).</>
      : <><strong>&ldquo;{stateRegion.name}&rdquo;</strong> will be moved to the trash.<br />You can restore it within 30 days.</>;

  const actions = [
    ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: () => setShowEdit(true) }] : []),
    ...(canDelete ? [{ label: "Delete" as const, icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" as const }] : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

      {showEdit && (
        <StateRegionForm
          open={showEdit}
          onOpenChange={setShowEdit}
          stateRegion={stateRegion}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete state/region?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
