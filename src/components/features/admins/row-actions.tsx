"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { AdminForm } from "./admin-form";
import { deleteAdmin } from "@/lib/actions/admin";
import { PRIMARY_ADMIN_ID } from "@/lib/constants";
import type { AdminWithRole } from "@/types/admin";
import type { Role } from "@/types/role";

interface AdminRowActionsProps {
  admin: AdminWithRole;
  roles: Role[];
}

export function AdminRowActions({ admin, roles }: AdminRowActionsProps) {
  const canEdit = useHasPermission("admin_users", "edit");
  const canDelete = useHasPermission("admin_users", "delete");
  const { data: session } = useSession();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPrimaryAdmin = admin.user_id === PRIMARY_ADMIN_ID;
  // Server-side updateAdmin rejects edits where the actor is the target
  // ("Use your profile page to edit your own account"). Mirror that gate in
  // the UI so the buttons aren't clickable just to error out.
  const isSelf = Number(session?.user?.id) === admin.user_id;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAdmin(admin.user_id);
      if (result.success) {
        toast.success("Admin deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const actions = [
    ...(canEdit
      ? [
          {
            label: "Edit" as const,
            icon: Pencil,
            onClick: () => setShowEdit(true),
            disabled: isPrimaryAdmin || isSelf,
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            label: "Delete" as const,
            icon: Trash2,
            onClick: () => setShowDelete(true),
            variant: "destructive" as const,
            disabled: isPrimaryAdmin || isSelf,
            separatorBefore: true,
          },
        ]
      : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActions actions={actions} />

      {showEdit && (
        <AdminForm
          open={showEdit}
          onOpenChange={setShowEdit}
          admin={admin}
          roles={roles}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete admin?"
        description={
          <>
            <strong>&ldquo;{admin.username}&rdquo;</strong> will be moved to the
            trash.
            <br />
            You can restore it within 30 days.
          </>
        }
        isPending={isPending}
      />
    </>
  );
}
