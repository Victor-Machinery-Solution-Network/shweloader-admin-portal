"use client";

import { useState, useTransition, useMemo } from "react";
import { KeyRound, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FieldError } from "@/components/ui/required-input";
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
import { updateAppUser, resetAppUserPassword } from "@/lib/actions/app-user";
import type { AppUser, BusinessType } from "@/types/app-user";

interface UserEditFormProps {
  user: AppUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessTypes: BusinessType[];
  onPasswordGenerated: (password: string) => void;
}

export function UserEditForm({
  user,
  open,
  onOpenChange,
  businessTypes,
  onPasswordGenerated,
}: UserEditFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isResetting, startResetTransition] = useTransition();

  // Business type combobox state
  const btIdByName = useMemo(
    () => new Map(businessTypes.map((bt) => [bt.name, bt.business_type_id])),
    [businessTypes],
  );
  const btNameById = useMemo(
    () => new Map(businessTypes.map((bt) => [bt.business_type_id, bt.name])),
    [businessTypes],
  );
  const OTHER_OPTION = "Other";
  const btNames = useMemo(
    () => [...businessTypes.map((bt) => bt.name), OTHER_OPTION],
    [businessTypes],
  );

  // Resolve initial business type name
  const initialBT = btNameById.get(user.business_type_id) ?? OTHER_OPTION;
  const [selectedBT, setSelectedBT] = useState(initialBT);
  const isOther = selectedBT === OTHER_OPTION;

  function handleResetPassword() {
    startResetTransition(async () => {
      const result = await resetAppUserPassword(user.app_user_id);
      if (result.success && result.password) {
        toast.success("Password has been reset");
        onOpenChange(false);
        onPasswordGenerated(result.password);
      } else {
        toast.error(result.error ?? "Failed to reset password");
      }
    });
  }

  function handleSubmit(formData: FormData) {
    if (!selectedBT) {
      toast.error("Business type is required");
      return;
    }
    if (isOther) {
      const otherName = formData.get("business_type_other") as string;
      if (!otherName?.trim()) {
        toast.error("Please specify the business type");
        return;
      }
    } else {
      const btId = btIdByName.get(selectedBT);
      if (btId) formData.set("business_type_id", String(btId));
    }
    startTransition(async () => {
      const result = await updateAppUser(user.app_user_id, formData);

      if (result.success) {
        toast.success("User updated");
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
      title="Edit User"
      description={`Update details for ${user.username}`}
      icon={<Pencil className="text-primary-foreground size-6" />}
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel="Save Changes"
      className="sm:max-w-2xl"
    >
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {/* Row 1: Identity (required) */}
        <Field orientation="vertical">
          <FieldLabel>Username</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="username"
              defaultValue={user.username}
              placeholder="e.g. john_doe"
              errorMessage="Username is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Full Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="full_name"
              defaultValue={user.full_name}
              placeholder="e.g. Aung Kyaw"
              errorMessage="Full name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        {/* Row 2: Contact */}
        <Field orientation="vertical">
          <FieldLabel>Phone</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="phone"
              type="tel"
              defaultValue={user.phone}
              placeholder="e.g. 09xxxxxxxxx"
              errorMessage="Phone number is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>
            Email{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <FieldContent>
            <Input
              name="email"
              type="email"
              defaultValue={user.email ?? ""}
              placeholder="e.g. user@example.com"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        {/* Row 3: Business type */}
        <Field
          orientation="vertical"
          className={
            isOther ? undefined : "sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]"
          }
        >
          <FieldLabel>Business Type</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedBT}
              onValueChange={(val) => setSelectedBT(val ?? "")}
              items={btNames}
            >
              <ComboboxInput
                placeholder="Select business type..."
                showClear={!!selectedBT}
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No business type found</ComboboxEmpty>
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
            <FieldError
              show={!selectedBT}
              message="Business type is required"
            />
          </FieldContent>
        </Field>

        {isOther && (
          <Field orientation="vertical">
            <FieldLabel>Specify Business Type</FieldLabel>
            <FieldContent>
              <RequiredInput
                name="business_type_other"
                placeholder="e.g. Consulting Firm"
                errorMessage="Please specify the business type"
                autoComplete="off"
                autoFocus
              />
            </FieldContent>
          </Field>
        )}

        {/* Row 4: Company + Address */}
        <Field orientation="vertical">
          <FieldLabel>
            Company Name{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <FieldContent>
            <Input
              name="company_name"
              defaultValue={user.company_name ?? ""}
              placeholder="e.g. ABC Construction Co."
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>
            Address{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <FieldContent>
            <Input
              name="address"
              defaultValue={user.address ?? ""}
              placeholder="e.g. No. 123, Main Street, Yangon"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        {/* Reset Password */}
        <div className="sm:col-span-2 flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <div className="font-medium text-sm">Reset Password</div>
            <p className="text-muted-foreground text-xs">
              Generate a new password for this user
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetPassword}
            disabled={isResetting}
          >
            {isResetting ? <Spinner className="mr-1" /> : <KeyRound className="size-4" />}
            {isResetting ? "Resetting..." : "Reset"}
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}
