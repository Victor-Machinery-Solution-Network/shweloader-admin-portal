"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { TownshipForm } from "./location-form";
import { deleteTownship } from "@/lib/actions/location";
import type { TownshipWithParents, StateRegion, District } from "@/types/location";

interface RowActionsProps {
  township: TownshipWithParents;
  linkedCount: number;
  stateRegions: StateRegion[];
  districts: District[];
}

export function RowActions({ township, linkedCount, stateRegions, districts }: RowActionsProps) {
  const canEdit = useHasPermission("locations", "edit");
  const canDelete = useHasPermission("locations", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTownship(township.township_id);
      if (result.success) {
        toast.success("Township deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deleteDescription =
    linkedCount > 0
      ? <><strong>&ldquo;{township.name}&rdquo;</strong> ({township.district_name}, {township.state_region_name}) will be moved to the trash.<br />There {linkedCount === 1 ? "is" : "are"} <strong>{linkedCount}</strong> {linkedCount === 1 ? "listing" : "listings"} linked to this township that must be removed first.</>
      : <><strong>&ldquo;{township.name}&rdquo;</strong> ({township.district_name}, {township.state_region_name}) will be moved to the trash.<br />You can restore it within 30 days.</>;

  const actions = [
    ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: () => setShowEdit(true) }] : []),
    ...(canDelete ? [{ label: "Delete" as const, icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" as const }] : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

      {showEdit && (
        <TownshipForm
          open={showEdit}
          onOpenChange={setShowEdit}
          township={township}
          stateRegions={stateRegions}
          districts={districts}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete township?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
