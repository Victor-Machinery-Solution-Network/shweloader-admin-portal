"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { AnnouncementForm } from "./announcement-form";
import { deleteAnnouncement } from "@/lib/actions/announcement";
import type { AnnouncementText } from "@/types/announcement";

interface RowActionsProps {
  announcement: AnnouncementText;
}

export function RowActions({ announcement }: RowActionsProps) {
  const canEdit = useHasPermission("announcements", "edit");
  const canDelete = useHasPermission("announcements", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAnnouncement(announcement.announcement_id);
      if (result.success) {
        toast.success("Announcement deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete announcement");
      }
    });
  }

  const actions = [
    ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: () => setShowEdit(true) }] : []),
    ...(canDelete ? [{ label: "Delete" as const, icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" as const }] : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

      {showEdit && (
        <AnnouncementForm
          open={showEdit}
          onOpenChange={setShowEdit}
          announcement={announcement}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete announcement?"
        description="This will permanently delete the announcement. This action cannot be undone."
        isPending={isPending}
      />
    </>
  );
}
