"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { AnnouncementForm } from "./announcement-form";
import { deleteAnnouncement } from "@/lib/actions/announcement";
import type { AnnouncementText } from "@/types/announcement";

interface RowActionsProps {
  announcement: AnnouncementText;
}

export function RowActions({ announcement }: RowActionsProps) {
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setShowEdit(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setShowDelete(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AnnouncementForm
        open={showEdit}
        onOpenChange={setShowEdit}
        announcement={announcement}
      />

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
