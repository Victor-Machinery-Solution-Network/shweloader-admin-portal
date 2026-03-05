"use client";

import { useTransition } from "react";
import { ListChecks, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createConditionType,
  updateConditionType,
} from "@/lib/actions/condition-type";
import type { ConditionType } from "@/types/listing";

interface ConditionTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conditionType?: ConditionType;
}

export function ConditionTypeForm({
  open,
  onOpenChange,
  conditionType,
}: ConditionTypeFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!conditionType;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateConditionType(conditionType.id, formData)
        : await createConditionType(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Condition updated" : "Condition created",
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
      title={isEditing ? "Edit Sale Condition" : "Add Sale Condition"}
      description={
        isEditing
          ? "Update the condition details."
          : "Create a new sale condition."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary-foreground size-6" />
          : <ListChecks className="text-primary-foreground size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Condition Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Brand New"
              defaultValue={conditionType?.name ?? ""}
              errorMessage="Condition name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
