"use client";

import { useState, useTransition } from "react";
import { FolderOpen, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { ImageInput } from "@/components/ui/image-input";
import {
  createAttachmentCategory,
  updateAttachmentCategory,
} from "@/lib/actions/attachment";
import type { AttachmentCategory } from "@/types/attachment";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AttachmentCategory;
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
}: CategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!category;
  const [focalPoint, setFocalPoint] = useState<{ x: number; y: number } | null>(
    category?.focal_x != null && category?.focal_y != null
      ? { x: category.focal_x, y: category.focal_y }
      : null,
  );

  function handleSubmit(formData: FormData) {
    if (focalPoint) {
      formData.set("focal_x", String(focalPoint.x));
      formData.set("focal_y", String(focalPoint.y));
    }
    startTransition(async () => {
      const result = isEditing
        ? await updateAttachmentCategory(category.category_id, formData)
        : await createAttachmentCategory(formData);

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
          : "Create a new attachment category."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary-foreground size-6" />
          : <FolderOpen className="text-primary-foreground size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Category Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Buckets"
              defaultValue={category?.name ?? ""}
              errorMessage="Category name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel>Image</FieldLabel>
          <FieldContent>
            <ImageInput
              name="image_url"
              value={category?.image_url}
              aspectRatio={1}
              focalPoint={focalPoint ?? undefined}
              onFocalPointChange={setFocalPoint}
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
