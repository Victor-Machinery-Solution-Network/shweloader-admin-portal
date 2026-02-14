"use client";

import { useTransition } from "react";
import { Briefcase, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createBusinessType,
  updateBusinessType,
} from "@/lib/actions/business-type";
import type { BusinessType } from "@/types/customer";

interface BusinessTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessType?: BusinessType;
}

export function BusinessTypeForm({
  open,
  onOpenChange,
  businessType,
}: BusinessTypeFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!businessType;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateBusinessType(businessType.business_type_id, formData)
        : await createBusinessType(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Business type updated" : "Business type created",
        );
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
      title={isEditing ? "Edit Business Type" : "Add Business Type"}
      description={
        isEditing
          ? "Update the business type details."
          : "Create a new business type."
      }
      icon={
        isEditing
          ? <Pencil className="text-muted-foreground size-6" />
          : <Briefcase className="text-muted-foreground size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Business Type Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Construction"
              defaultValue={businessType?.name ?? ""}
              errorMessage="Business type name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
