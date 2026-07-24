"use client";

import { useTransition } from "react";
import { Handshake, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createPartnerType,
  updatePartnerType,
} from "@/lib/actions/partner-type";
import type { PartnerType } from "@/types/partner";

interface PartnerTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerType?: Pick<PartnerType, "id" | "name" | "name_my">;
}

export function PartnerTypeForm({
  open,
  onOpenChange,
  partnerType,
}: PartnerTypeFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!partnerType;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updatePartnerType(partnerType.id, formData)
        : await createPartnerType(formData);

      if (result.success) {
        toast.success(isEditing ? "Partner type updated" : "Partner type created");
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
      title={isEditing ? "Edit Partner Type" : "Add Partner Type"}
      description={
        isEditing
          ? "Update the partner type details."
          : "Create a new partner type."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary-foreground size-6" />
          : <Handshake className="text-primary-foreground size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Partner Type Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Dealer"
              defaultValue={partnerType?.name ?? ""}
              errorMessage="Partner type name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel>Burmese Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name_my"
              placeholder="e.g. ယာဉ်ရောင်းချသူ"
              defaultValue={partnerType?.name_my ?? ""}
              errorMessage="Burmese name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
