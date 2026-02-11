"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { ImageInput } from "@/components/ui/image-input";
import {
  createMainCategory,
  updateMainCategory,
} from "@/lib/actions/equipment";
import type { EquipmentMainCategory } from "@/types/equipment";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: EquipmentMainCategory;
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
}: CategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!category;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateMainCategory(category.category_id, formData)
        : await createMainCategory(formData);

      if (result.success) {
        toast.success(isEditing ? "Category updated" : "Category created");
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
      title={isEditing ? "Edit Category" : "Add Category"}
      description={
        isEditing
          ? "Update the category details."
          : "Create a new main category."
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Main Category Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Excavators"
              defaultValue={category?.name ?? ""}
              errorMessage="Category name is required"
            />
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel>Image</FieldLabel>
          <FieldContent>
            <ImageInput name="image_url" value={category?.image_url} />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
