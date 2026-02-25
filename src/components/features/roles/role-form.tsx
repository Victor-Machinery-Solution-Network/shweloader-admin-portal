"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Shield,
  Pencil,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { RequiredInput } from "@/components/ui/required-input";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { createRole, updateRole } from "@/lib/actions/role";
import type { Role, FeaturePermission } from "@/types/role";

// ─── Visual config ──────────────────────────────────────────────────────────

const PERMISSION_STYLE: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  create:  { icon: Plus,        color: "text-emerald-500", bg: "bg-emerald-500/10" },
  read:    { icon: Eye,         color: "text-blue-500",    bg: "bg-blue-500/10" },
  edit:    { icon: Pencil,      color: "text-amber-500",   bg: "bg-amber-500/10" },
  delete:  { icon: Trash2,      color: "text-rose-500",    bg: "bg-rose-500/10" },
  approve: { icon: CheckCircle, color: "text-violet-500",  bg: "bg-violet-500/10" },
};

const GROUP_STYLE: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  Dashboard:      { icon: LayoutDashboard, color: "text-blue-500",    bg: "bg-blue-500/10" },
  Catalog:        { icon: Package,         color: "text-amber-500",   bg: "bg-amber-500/10" },
  Marketplace:    { icon: ShoppingCart,    color: "text-emerald-500", bg: "bg-emerald-500/10" },
  Users:          { icon: Users,           color: "text-violet-500",  bg: "bg-violet-500/10" },
  Content:        { icon: FileText,        color: "text-cyan-500",    bg: "bg-cyan-500/10" },
  Administration: { icon: Settings,        color: "text-rose-500",    bg: "bg-rose-500/10" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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

  // Derive permission columns and feature groups from DB data (no hardcoding)
  const { permissions, featureGroups, fpByFeatureAndPerm, fpByFeature, fpByPerm, allFpIds } =
    useMemo(() => {
      const byFeatureAndPerm = new Map<string, number>();
      const byFeature = new Map<string, number[]>();
      const byPerm = new Map<string, number[]>();
      const allIds: number[] = [];

      // Build permission column list (unique, ordered by display_order)
      const permMap = new Map<string, number>();
      // Build feature groups (preserving SQL sort order)
      const groupMap = new Map<string, string[]>();
      const featureSet = new Set<string>();

      for (const fp of featurePermissions) {
        // Permission columns
        if (!permMap.has(fp.permission_name)) {
          permMap.set(fp.permission_name, fp.permission_display_order);
        }

        // Feature groups (dedup by feature_name, preserving order)
        if (!featureSet.has(fp.feature_name)) {
          featureSet.add(fp.feature_name);
          const list = groupMap.get(fp.group_name) ?? [];
          list.push(fp.feature_name);
          groupMap.set(fp.group_name, list);
        }

        // Lookup maps
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

      const permissions = Array.from(permMap.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([name]) => name);

      const featureGroups = Array.from(groupMap.entries()).map(
        ([label, features]) => ({ label, features }),
      );

      return {
        permissions,
        featureGroups,
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">
            Permissions
          </p>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={masterChecked()}
                        onCheckedChange={toggleAll}
                        aria-label="Select all permissions"
                      />
                      <span className="text-xs text-muted-foreground">Feature</span>
                    </div>
                  </th>
                  {permissions.map((perm) => {
                    const style = PERMISSION_STYLE[perm];
                    const PermIcon = style?.icon;
                    return (
                      <th key={perm} className="px-3 py-3 text-center font-medium">
                        <div className="flex flex-col items-center gap-1.5">
                          <Checkbox
                            checked={permColumnChecked(perm)}
                            onCheckedChange={() => togglePermissionColumn(perm)}
                            aria-label={`Select all ${perm}`}
                          />
                          <div className="flex items-center gap-1">
                            {PermIcon && (
                              <PermIcon className={cn("size-3 text-muted-foreground/70")} />
                            )}
                            <span className="text-xs capitalize text-muted-foreground">
                              {humanize(perm)}
                            </span>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {featureGroups.map((group) => (
                  <PermissionGroup
                    key={group.label}
                    group={group}
                    permissions={permissions}
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
  permissions,
  fpByFeatureAndPerm,
  selected,
  onToggleOne,
  onToggleRow,
  featureRowChecked,
}: {
  group: { label: string; features: string[] };
  permissions: string[];
  fpByFeatureAndPerm: Map<string, number>;
  selected: Set<number>;
  onToggleOne: (fpId: number) => void;
  onToggleRow: (featureName: string) => void;
  featureRowChecked: (featureName: string) => boolean | "indeterminate";
}) {
  const style = GROUP_STYLE[group.label];
  const GroupIcon = style?.icon;

  return (
    <>
      <tr className="border-b">
        <td
          colSpan={permissions.length + 1}
          className="px-3 py-2"
        >
          <div className="flex items-center gap-2">
            {GroupIcon && (
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-md",
                  style.bg,
                )}
              >
                <GroupIcon className={cn("size-3.5", style.color)} />
              </div>
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </span>
          </div>
        </td>
      </tr>
      {group.features.map((featureName) => (
        <tr
          key={featureName}
          className="border-b last:border-0 transition-colors hover:bg-muted/30"
        >
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2 pl-8">
              <Checkbox
                checked={featureRowChecked(featureName)}
                onCheckedChange={() => onToggleRow(featureName)}
                aria-label={`Select all ${humanize(featureName)} permissions`}
              />
              <span className="text-sm">{humanize(featureName)}</span>
            </div>
          </td>
          {permissions.map((perm) => {
            const fpId = fpByFeatureAndPerm.get(`${featureName}|${perm}`);
            return (
              <td key={perm} className="px-3 py-2.5">
                <div className="flex justify-center">
                  {fpId !== undefined ? (
                    <Checkbox
                      checked={selected.has(fpId)}
                      onCheckedChange={() => onToggleOne(fpId)}
                      aria-label={`${humanize(featureName)} ${perm}`}
                    />
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
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
