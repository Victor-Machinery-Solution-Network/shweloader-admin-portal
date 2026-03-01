"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { RestoreDialog } from "./restore-dialog";
import { useHasPermission } from "@/hooks/use-permissions";
import { restoreItem, permanentDeleteItem } from "@/lib/actions/trash";
import { ENTITY_REGISTRY } from "@/lib/trash/entity-registry";
import type { TrashItem } from "@/types/trash";

interface TrashRowActionsProps {
  item: TrashItem;
}

export function TrashRowActions({ item }: TrashRowActionsProps) {
  const canRestore = useHasPermission("trash", "restore");
  const canDelete = useHasPermission("trash", "delete");

  const [showRestore, setShowRestore] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const config = ENTITY_REGISTRY[item.entity_type];
  const displayName = config?.displayName ?? item.entity_type;

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreItem(item.entity_type, item.entity_id);
      if (result.success) {
        toast.success(`${displayName} restored successfully`);
        setShowRestore(false);
      } else {
        toast.error(result.error ?? "Failed to restore item");
      }
    });
  }

  function handlePermanentDelete() {
    startTransition(async () => {
      const result = await permanentDeleteItem(item.entity_type, item.entity_id);
      if (result.success) {
        toast.success(`${displayName} permanently deleted`);
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to permanently delete item");
      }
    });
  }

  const actions = [];
  if (canRestore) {
    actions.push({
      label: "Restore",
      icon: RotateCcw,
      onClick: () => setShowRestore(true),
      variant: "success" as const,
    });
  }
  if (canDelete) {
    actions.push({
      label: "Delete Forever",
      icon: Trash2,
      onClick: () => setShowDelete(true),
      variant: "destructive" as const,
      separatorBefore: canRestore,
    });
  }

  if (actions.length === 0) return null;

  return (
    <>
      <RowActions actions={actions} />

      {showRestore && (
        <RestoreDialog
          open={showRestore}
          onOpenChange={setShowRestore}
          onConfirm={handleRestore}
          itemName={item.entity_name}
          itemType={displayName}
          isPending={isPending}
        />
      )}

      {showDelete && (
        <DeleteDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          onConfirm={handlePermanentDelete}
          title={`Permanently delete ${displayName.toLowerCase()}?`}
          description={
            <>
              <strong>{item.entity_name}</strong> will be permanently deleted.
              {item.has_files && " Associated files will also be removed."}
              {" "}This action cannot be undone.
            </>
          }
          isPending={isPending}
        />
      )}
    </>
  );
}
