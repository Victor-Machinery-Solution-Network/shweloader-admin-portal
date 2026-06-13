"use client";

import { useState, useTransition } from "react";
import { FolderOpen, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput, FieldError } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { MultiSelect } from "@/components/ui/multi-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { ImageInput } from "@/components/ui/image-input";
import {
  createAttachmentCategory,
  updateAttachmentCategory,
} from "@/lib/actions/attachment";
import type { AttachmentCategory } from "@/types/attachment";
import type { EquipmentSubCategory } from "@/types/equipment";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: AttachmentCategory;
  subCategories: EquipmentSubCategory[];
  /** Current equipment sub-category IDs linked to this category (edit mode) */
  categorySubCategoryIds?: number[];
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
  subCategories,
  categorySubCategoryIds = [],
}: CategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>(
    categorySubCategoryIds.map(String),
  );
  const isEditing = !!category;

  // Reset the multi-select when the dialog opens (the create form stays mounted
  // across opens; remounting via `key` re-seeds MultiSelect's internal state).
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedSubCategoryIds(categorySubCategoryIds.map(String));
    }
    onOpenChange(nextOpen);
  };

  const subCategoryOptions = subCategories.map((sc) => ({
    label: sc.name,
    value: String(sc.sub_category_id),
  }));

  function handleSubmit(formData: FormData) {
    formData.set(
      "subCategoryIds",
      JSON.stringify(selectedSubCategoryIds.map(Number)),
    );

    startTransition(async () => {
      const result = isEditing
        ? await updateAttachmentCategory(category.category_id, formData)
        : await createAttachmentCategory(formData);

      if (result.success) {
        toast.success(isEditing ? "Category updated" : "Category created");
        handleOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
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
      isPending={isPending || isUploading}
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
          <FieldLabel>Equipment Sub-Categories</FieldLabel>
          <FieldContent>
            <MultiSelect
              key={open ? "open" : "closed"}
              options={subCategoryOptions}
              defaultValue={selectedSubCategoryIds}
              onValueChange={setSelectedSubCategoryIds}
              placeholder="Select equipment sub-categories…"
              maxCount={3}
            />
            <FieldError
              show={selectedSubCategoryIds.length === 0}
              message="At least one equipment sub-category is required"
            />
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel>Image</FieldLabel>
          <FieldContent>
            <ImageInput
              name="image_url"
              value={category?.image_url}
              feature="attachment_categories"
              permission={isEditing ? "edit" : "create"}
              onUploadingChange={setIsUploading}
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
