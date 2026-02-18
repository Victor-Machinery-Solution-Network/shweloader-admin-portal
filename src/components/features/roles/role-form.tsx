"use client";

import { useState, useMemo, useTransition } from "react";
import { Shield, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { RequiredInput } from "@/components/ui/required-input";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { createRole, updateRole } from "@/lib/actions/role";
import type { Role, FeaturePermission } from "@/types/role";

// ─── Constants ──────────────────────────────────────────────────────────────

const PERMISSION_ORDER = ["create", "read", "edit", "delete", "approve"] as const;

const FEATURE_GROUPS: { label: string; features: string[] }[] = [
  {
    label: "Marketplace",
    features: ["sale_listings", "rent_listings", "featured_listings"],
  },
  {
    label: "Equipment",
    features: [
      "equipment_main_categories",
      "equipment_sub_categories",
      "equipment_models",
    ],
  },
  {
    label: "Attachments",
    features: ["attachment_categories", "attachment_models"],
  },
  { label: "Catalog", features: ["brands", "locations"] },
  { label: "Users", features: ["customers", "partners", "enquiries"] },
  {
    label: "Content",
    features: ["articles", "article_categories", "announcements", "carousels"],
  },
  {
    label: "Administration",
    features: ["admin_users", "roles", "app_settings", "business_types"],
  },
];

function humanize(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Component ──────────────────────────────────────────────────────────────

interface RoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
  featurePermissions: FeaturePermission[];
  rolePermissionIds?: number[];
}

export function RoleForm({
  open,
  onOpenChange,
  role,
  featurePermissions,
  rolePermissionIds = [],
}: RoleFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(rolePermissionIds),
  );
  const isEditing = !!role;

  const { fpByFeatureAndPerm, fpByFeature, fpByPerm, allFpIds } =
    useMemo(() => {
      const byFeatureAndPerm = new Map<string, number>();
      const byFeature = new Map<string, number[]>();
      const byPerm = new Map<string, number[]>();
      const allIds: number[] = [];

      for (const fp of featurePermissions) {
        const key = `${fp.feature_name}|${fp.permission_name}`;
        byFeatureAndPerm.set(key, fp.feature_permission_id);
        allIds.push(fp.feature_permission_id);

        const featureList = byFeature.get(fp.feature_name) ?? [];
        featureList.push(fp.feature_permission_id);
        byFeature.set(fp.feature_name, featureList);

        const permList = byPerm.get(fp.permission_name) ?? [];
        permList.push(fp.feature_permission_id);
        byPerm.set(fp.permission_name, permList);
      }

      return {
        fpByFeatureAndPerm: byFeatureAndPerm,
        fpByFeature: byFeature,
        fpByPerm: byPerm,
        allFpIds: allIds,
      };
    }, [featurePermissions]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelected(new Set(rolePermissionIds));
    }
    onOpenChange(nextOpen);
  };

  // ─── Selection helpers ──────────────────────────────────────────────────

  function toggleOne(fpId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fpId)) next.delete(fpId);
      else next.add(fpId);
      return next;
    });
  }

  function toggleFeatureRow(featureName: string) {
    const ids = fpByFeature.get(featureName) ?? [];
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function togglePermissionColumn(permName: string) {
    const ids = fpByPerm.get(permName) ?? [];
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === allFpIds.length) return new Set<number>();
      return new Set(allFpIds);
    });
  }

  // ─── Checked-state helpers ────────────────────────────────────────────

  function featureRowChecked(
    featureName: string,
  ): boolean | "indeterminate" {
    const ids = fpByFeature.get(featureName) ?? [];
    const count = ids.filter((id) => selected.has(id)).length;
    if (count === 0) return false;
    if (count === ids.length) return true;
    return "indeterminate";
  }

  function permColumnChecked(
    permName: string,
  ): boolean | "indeterminate" {
    const ids = fpByPerm.get(permName) ?? [];
    const count = ids.filter((id) => selected.has(id)).length;
    if (count === 0) return false;
    if (count === ids.length) return true;
    return "indeterminate";
  }

  function masterChecked(): boolean | "indeterminate" {
    if (selected.size === 0) return false;
    if (selected.size === allFpIds.length) return true;
    return "indeterminate";
  }

  // ─── Submit ───────────────────────────────────────────────────────────

  function handleSubmit(formData: FormData) {
    formData.set("permissionIds", JSON.stringify(Array.from(selected)));

    startTransition(async () => {
      const result = isEditing
        ? await updateRole(role.role_id, formData)
        : await createRole(formData);

      if (result.success) {
        toast.success(isEditing ? "Role updated" : "Role created");
        handleOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Edit Role" : "Add Role"}
      description={
        isEditing
          ? "Update the role details and permissions."
          : "Create a new role and assign permissions."
      }
      icon={
        isEditing ? (
          <Pencil className="text-primary-foreground size-6" />
        ) : (
          <Shield className="text-primary-foreground size-6" />
        )
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
      className="sm:max-w-4xl"
    >
      <div className="space-y-6">
        {/* Name & Description */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field orientation="vertical">
            <FieldLabel>Role Name</FieldLabel>
            <FieldContent>
              <RequiredInput
                name="name"
                placeholder="e.g. Content Editor"
                defaultValue={role?.name ?? ""}
                errorMessage="Role name is required"
                autoComplete="off"
              />
            </FieldContent>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Description</FieldLabel>
            <FieldContent>
              <Input
                name="description"
                placeholder="Optional description..."
                defaultValue={role?.description ?? ""}
              />
            </FieldContent>
          </Field>
        </div>

        {/* Permission Matrix */}
        <div>
          <p className="text-sm font-medium mb-3">Permissions</p>
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left px-3 py-2.5 font-medium">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={masterChecked()}
                        onCheckedChange={toggleAll}
                        aria-label="Select all permissions"
                      />
                      <span>Feature</span>
                    </div>
                  </th>
                  {PERMISSION_ORDER.map((perm) => (
                    <th
                      key={perm}
                      className="px-3 py-2.5 text-center font-medium"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Checkbox
                          checked={permColumnChecked(perm)}
                          onCheckedChange={() => togglePermissionColumn(perm)}
                          aria-label={`Select all ${perm}`}
                        />
                        <span className="text-xs capitalize">
                          {humanize(perm)}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_GROUPS.map((group) => (
                  <PermissionGroup
                    key={group.label}
                    group={group}
                    fpByFeatureAndPerm={fpByFeatureAndPerm}
                    selected={selected}
                    onToggleOne={toggleOne}
                    onToggleRow={toggleFeatureRow}
                    featureRowChecked={featureRowChecked}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FormDialog>
  );
}

// ─── Sub-component: permission group rows ───────────────────────────────────

function PermissionGroup({
  group,
  fpByFeatureAndPerm,
  selected,
  onToggleOne,
  onToggleRow,
  featureRowChecked,
}: {
  group: { label: string; features: string[] };
  fpByFeatureAndPerm: Map<string, number>;
  selected: Set<number>;
  onToggleOne: (fpId: number) => void;
  onToggleRow: (featureName: string) => void;
  featureRowChecked: (featureName: string) => boolean | "indeterminate";
}) {
  return (
    <>
      <tr className="bg-muted/30 border-b">
        <td
          colSpan={PERMISSION_ORDER.length + 1}
          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {group.label}
        </td>
      </tr>
      {group.features.map((featureName) => (
        <tr key={featureName} className="border-b last:border-0">
          <td className="px-3 py-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={featureRowChecked(featureName)}
                onCheckedChange={() => onToggleRow(featureName)}
                aria-label={`Select all ${humanize(featureName)} permissions`}
              />
              <span>{humanize(featureName)}</span>
            </div>
          </td>
          {PERMISSION_ORDER.map((perm) => {
            const fpId = fpByFeatureAndPerm.get(`${featureName}|${perm}`);
            return (
              <td key={perm} className="px-3 py-2">
                <div className="flex justify-center">
                  {fpId !== undefined ? (
                    <Checkbox
                      checked={selected.has(fpId)}
                      onCheckedChange={() => onToggleOne(fpId)}
                      aria-label={`${humanize(featureName)} ${perm}`}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
