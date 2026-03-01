"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { RoleForm } from "./role-form";
import { deleteRole } from "@/lib/actions/role";
import { SUPER_ADMIN_ROLE_ID } from "@/lib/constants";
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
  const canEdit = useHasPermission("roles", "edit");
  const canDelete = useHasPermission("roles", "delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isSuperAdmin = role.role_id === SUPER_ADMIN_ROLE_ID;

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
        <strong>&ldquo;{role.name}&rdquo;</strong> will be moved to the trash.
        <br />
        There {adminCount === 1 ? "is" : "are"}{" "}
        <strong>{adminCount}</strong>{" "}
        {adminCount === 1 ? "admin" : "admins"} assigned to this role.
      </>
    ) : (
      <>
        <strong>&ldquo;{role.name}&rdquo;</strong> will be moved to the trash.
        <br />
        You can restore it within 30 days.
      </>
    );

  const actions = [
    ...(canEdit
      ? [
          {
            label: "Edit" as const,
            icon: Pencil,
            onClick: () => setShowEdit(true),
            disabled: isSuperAdmin,
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
            disabled: isSuperAdmin,
            separatorBefore: true,
          },
        ]
      : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

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
