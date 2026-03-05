"use client";

import { useState, useEffect, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { ConditionTypeForm } from "./condition-type-form";
import {
  deleteConditionType,
  getListingCountByCondition,
} from "@/lib/actions/condition-type";
import type { ConditionType } from "@/types/listing";

interface RowActionsProps {
  conditionType: ConditionType;
}

export function RowActions({ conditionType }: RowActionsProps) {
  const canEdit = useHasPermission("condition_types", "edit");
  const canDelete = useHasPermission("condition_types", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!showDelete) return;
    let cancelled = false;
    getListingCountByCondition([conditionType.id]).then((counts) => {
      if (!cancelled) setLinkedCount(counts[conditionType.id] ?? 0);
    });
    return () => {
      cancelled = true;
      setLinkedCount(null);
    };
  }, [showDelete, conditionType.id]);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteConditionType(conditionType.id);
      if (result.success) {
        toast.success("Condition deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deleteDescription =
    linkedCount !== null && linkedCount > 0
      ? <><strong>&ldquo;{conditionType.name}&rdquo;</strong> will be permanently deleted.<br />There {linkedCount === 1 ? "is" : "are"} <strong>{linkedCount}</strong> {linkedCount === 1 ? "listing" : "listings"} using this condition.</>
      : <><strong>&ldquo;{conditionType.name}&rdquo;</strong> will be permanently deleted.<br />This action cannot be undone.</>;

  if (!canEdit && !canDelete) return null;

  return (
    <>
      <RowActionsUI
        actions={[
          ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: () => setShowEdit(true) }] : []),
          ...(canDelete ? [{ label: "Delete" as const, icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" as const }] : []),
        ]}
      />

      {showEdit && (
        <ConditionTypeForm
          open={showEdit}
          onOpenChange={setShowEdit}
          conditionType={conditionType}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete sale condition?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
