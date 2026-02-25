"use client";

import { useState, useTransition, useMemo } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput, FieldError } from "@/components/ui/required-input";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { FormDialog } from "@/components/shared/form-dialog";
import { createAdmin, updateAdmin } from "@/lib/actions/admin";
import type { AdminWithRole } from "@/types/admin";
import type { Role } from "@/types/role";

interface AdminFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin?: AdminWithRole;
  roles: Role[];
}

export function AdminForm({
  open,
  onOpenChange,
  admin,
  roles,
}: AdminFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!admin;

  const roleIdByName = useMemo(
    () => new Map(roles.map((r) => [r.name, r.role_id])),
    [roles],
  );
  const roleNameById = useMemo(
    () => new Map(roles.map((r) => [r.role_id, r.name])),
    [roles],
  );
  const roleNames = useMemo(() => roles.map((r) => r.name), [roles]);

  const defaultRoleName = admin?.role_id
    ? (roleNameById.get(admin.role_id) ?? "")
    : "";
  const [selectedRoleName, setSelectedRoleName] = useState(defaultRoleName);

  function handleSubmit(formData: FormData) {
    const roleId = roleIdByName.get(selectedRoleName);
    if (roleId) formData.set("roleId", String(roleId));

    startTransition(async () => {
      const result = isEditing
        ? await updateAdmin(admin.user_id, formData)
        : await createAdmin(formData);

      if (result.success) {
        toast.success(isEditing ? "Admin updated" : "Admin created");
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Admin" : "Add Admin"}
      description={
        isEditing
          ? "Update admin account details."
          : "Create a new admin account."
      }
      icon={
        isEditing ? (
          <Pencil className="text-primary-foreground size-6" />
        ) : (
          <UserPlus className="text-primary-foreground size-6" />
        )
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field orientation="vertical">
            <FieldLabel>Username</FieldLabel>
            <FieldContent>
              <RequiredInput
                name="username"
                placeholder="e.g. john_doe"
                defaultValue={admin?.username ?? ""}
                errorMessage="Username is required"
                autoComplete="off"
              />
            </FieldContent>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Role</FieldLabel>
            <FieldContent>
              <div className="space-y-1">
                <Combobox
                  value={selectedRoleName}
                  onValueChange={(val) => setSelectedRoleName(val ?? "")}
                  items={roleNames}
                >
                  <ComboboxInput
                    placeholder="Search role..."
                    showClear={!!selectedRoleName}
                  />
                  <ComboboxContent>
                    <ComboboxList>
                      <ComboboxEmpty>No role found</ComboboxEmpty>
                      <ComboboxCollection>
                        {(name) => (
                          <ComboboxItem key={name} value={name}>
                            {name}
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                <FieldError show={!selectedRoleName} message="Please select a role" />
              </div>
            </FieldContent>
          </Field>
        </div>

        <Field orientation="vertical">
          <FieldLabel>Email</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="email"
              type="email"
              placeholder="e.g. admin@example.com"
              defaultValue={admin?.email ?? ""}
              errorMessage="Email is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>
            Password{isEditing && (
              <span className="text-muted-foreground font-normal ml-1">
                (leave blank to keep current)
              </span>
            )}
          </FieldLabel>
          <FieldContent>
            {isEditing ? (
              <Input
                name="password"
                type="password"
                placeholder="Enter new password"
                minLength={8}
                autoComplete="new-password"
              />
            ) : (
              <RequiredInput
                name="password"
                type="password"
                placeholder="Min 8 characters"
                minLength={8}
                errorMessage="Password is required (min 8 characters)"
                autoComplete="new-password"
              />
            )}
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
