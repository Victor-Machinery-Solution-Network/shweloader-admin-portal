"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { RoleForm } from "./role-form";
import { deleteRole } from "@/lib/actions/role";
import type { RoleWithPermissionCount, FeaturePermission } from "@/types/role";

interface RoleRowActionsProps {
  role: RoleWithPermissionCount;
  featurePermissions: FeaturePermission[];
  adminCount: number;
  rolePermissionIds: number[];
}

export function RoleRowActions({
  role,
  featurePermissions,
  adminCount,
  rolePermissionIds,
}: RoleRowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isSuperAdmin = role.name === "Super Admin";

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRole(role.role_id);
      if (result.success) {
        toast.success("Role deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deleteDescription =
    adminCount > 0 ? (
      <>
        This will permanently delete{" "}
        <strong>&ldquo;{role.name}&rdquo;</strong>.
        <br />
        There {adminCount === 1 ? "is" : "are"}{" "}
        <strong>{adminCount}</strong>{" "}
        {adminCount === 1 ? "admin" : "admins"} assigned to this role.
      </>
    ) : (
      <>
        This will permanently delete{" "}
        <strong>&ldquo;{role.name}&rdquo;</strong>.
        <br />
        This action cannot be undone.
      </>
    );

  return (
    <>
      <RowActionsUI
        actions={[
          {
            label: "Edit",
            icon: Pencil,
            onClick: () => setShowEdit(true),
            disabled: isSuperAdmin,
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => setShowDelete(true),
            variant: "destructive",
            disabled: isSuperAdmin,
            separatorBefore: true,
          },
        ]}
      />

      {showEdit && (
        <RoleForm
          open={showEdit}
          onOpenChange={setShowEdit}
          role={role}
          featurePermissions={featurePermissions}
          rolePermissionIds={rolePermissionIds}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete role?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
