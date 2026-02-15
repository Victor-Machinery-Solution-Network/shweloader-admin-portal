"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { AdminForm } from "./admin-form";
import { deleteAdmin } from "@/lib/actions/admin";
import type { AdminWithRole } from "@/types/admin";
import type { Role } from "@/types/role";

interface AdminRowActionsProps {
  admin: AdminWithRole;
  roles: Role[];
}

export function AdminRowActions({ admin, roles }: AdminRowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPrimaryAdmin = admin.user_id === 1;
  const isSuperAdmin = admin.role_name === "Super Admin";

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

  return (
    <>
      <RowActions
        actions={[
          {
            label: "Edit",
            icon: Pencil,
            onClick: () => setShowEdit(true),
            disabled: isPrimaryAdmin || isSuperAdmin,
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => setShowDelete(true),
            variant: "destructive",
            disabled: isPrimaryAdmin || isSuperAdmin,
            separatorBefore: true,
          },
        ]}
      />

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
            This will permanently delete{" "}
            <strong>&ldquo;{admin.username}&rdquo;</strong>.
            <br />
            This action cannot be undone.
          </>
        }
        isPending={isPending}
      />
    </>
  );
}
