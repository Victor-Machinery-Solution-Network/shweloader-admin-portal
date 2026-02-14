"use client";

import { useTransition } from "react";
import { FolderOpen, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createArticleCategory,
  updateArticleCategory,
} from "@/lib/actions/article-category";
import type { ArticleCategory } from "@/types/article";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ArticleCategory;
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
        ? await updateArticleCategory(category.category_id, formData)
        : await createArticleCategory(formData);

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
      title={isEditing ? "Edit Category" : "Create Category"}
      description={
        isEditing
          ? "Update the category name."
          : "Add a new category for organizing articles."
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
      <Field orientation="vertical">
        <FieldLabel>Category Name</FieldLabel>
        <FieldContent>
          <RequiredInput
            name="name"
            placeholder="e.g. Maintenance Tips"
            defaultValue={category?.name ?? ""}
            errorMessage="Category name is required"
            autoComplete="off"
          />
        </FieldContent>
      </Field>
    </FormDialog>
  );
}
