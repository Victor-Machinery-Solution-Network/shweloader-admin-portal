"use client";

import { useState, useEffect, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { PartnerTypeForm } from "./partner-type-form";
import {
  deletePartnerType,
  getPartnerCountByType,
} from "@/lib/actions/partner-type";
import type { PartnerType } from "@/types/partner";

interface RowActionsProps {
  partnerType: Pick<PartnerType, "id" | "name">;
}

export function RowActions({ partnerType }: RowActionsProps) {
  const canEdit = useHasPermission("partners", "edit");
  const canDelete = useHasPermission("partners", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!showDelete) return;
    let cancelled = false;
    getPartnerCountByType([partnerType.id]).then((counts) => {
      if (!cancelled) setLinkedCount(counts[partnerType.id] ?? 0);
    });
    return () => {
      cancelled = true;
      setLinkedCount(null);
    };
  }, [showDelete, partnerType.id]);

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePartnerType(partnerType.id);
      if (result.success) {
        toast.success("Partner type deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deleteDescription =
    linkedCount !== null && linkedCount > 0
      ? <><strong>&ldquo;{partnerType.name}&rdquo;</strong> will be moved to the trash.<br />There {linkedCount === 1 ? "is" : "are"} <strong>{linkedCount}</strong> {linkedCount === 1 ? "partner" : "partners"} using this type.</>
      : <><strong>&ldquo;{partnerType.name}&rdquo;</strong> will be moved to the trash.<br />You can restore it within 30 days.</>;

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
        <PartnerTypeForm
          open={showEdit}
          onOpenChange={setShowEdit}
          partnerType={partnerType}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete partner type?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
