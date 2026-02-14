"use client";

import { useState, useMemo, useTransition } from "react";
import { FolderOpen, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { ImageInput } from "@/components/ui/image-input";
import { createSubCategory, updateSubCategory } from "@/lib/actions/equipment";
import type {
  EquipmentSubCategory,
  EquipmentMainCategory,
} from "@/types/equipment";

interface SubCategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subCategory?: EquipmentSubCategory;
  categories: EquipmentMainCategory[];
}

export function SubCategoryForm({
  open,
  onOpenChange,
  subCategory,
  categories,
}: SubCategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!subCategory;

  // Build a name→id lookup map
  const categoryMap = new Map(categories.map((c) => [c.name, c.category_id]));

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );

  const defaultName = subCategory
    ? (categories.find((c) => c.category_id === subCategory.category_id)
        ?.name ?? "")
    : "";

  const [selectedName, setSelectedName] = useState<string>(defaultName);

  function handleSubmit(formData: FormData) {
    const categoryId = categoryMap.get(selectedName);
    if (!categoryId) {
      toast.error("Please select a main category");
      return;
    }
    formData.set("category_id", categoryId.toString());

    startTransition(async () => {
      const result = isEditing
        ? await updateSubCategory(subCategory.sub_category_id, formData)
        : await createSubCategory(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Sub category updated" : "Sub category created",
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
      title={isEditing ? "Edit Sub Category" : "Add Sub Category"}
      description={
        isEditing
          ? "Update the sub category details."
          : "Create a new sub category."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary size-6" />
          : <FolderOpen className="text-primary size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Main Category</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedName}
              onValueChange={(val) => setSelectedName(val ?? "")}
              items={categoryNames}
            >
              <ComboboxInput
                placeholder="Search main category…"
                showClear={!!selectedName}
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No category found</ComboboxEmpty>
                  <ComboboxCollection>
                    {(categoryName) => (
                      <ComboboxItem key={categoryName} value={categoryName}>
                        {categoryName}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel>Sub Category Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Mini Excavators"
              defaultValue={subCategory?.name ?? ""}
              errorMessage="Sub category name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel>Image</FieldLabel>
          <FieldContent>
            <ImageInput name="image_url" value={subCategory?.image_url} />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
