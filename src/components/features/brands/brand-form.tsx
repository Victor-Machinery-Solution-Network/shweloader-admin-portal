"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { MultiSelect } from "@/components/ui/multi-select";
import { FormDialog } from "@/components/shared/form-dialog";
import { createBrand, updateBrand } from "@/lib/actions/brand";
import type { ProductBrand } from "@/types/brand";
import type { AttachmentCategory } from "@/types/attachment";
import type { EquipmentSubCategory } from "@/types/equipment";

interface BrandFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: ProductBrand;
  categories: AttachmentCategory[];
  subCategories: EquipmentSubCategory[];
  /** Current attachment category IDs linked to this brand (edit mode) */
  brandCategoryIds?: number[];
  /** Current equipment sub-category IDs linked to this brand (edit mode) */
  brandSubCategoryIds?: number[];
}

export function BrandForm({
  open,
  onOpenChange,
  brand,
  categories,
  subCategories,
  brandCategoryIds = [],
  brandSubCategoryIds = [],
}: BrandFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    brandCategoryIds.map(String),
  );
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<
    string[]
  >(brandSubCategoryIds.map(String));
  const isEditing = !!brand;

  // Reset selections when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedCategoryIds(brandCategoryIds.map(String));
      setSelectedSubCategoryIds(brandSubCategoryIds.map(String));
    }
    onOpenChange(nextOpen);
  };

  const categoryOptions = categories.map((c) => ({
    label: c.name,
    value: String(c.category_id),
  }));

  const subCategoryOptions = subCategories.map((sc) => ({
    label: sc.name,
    value: String(sc.sub_category_id),
  }));

  function handleSubmit(formData: FormData) {
    formData.set(
      "categoryIds",
      JSON.stringify(selectedCategoryIds.map(Number)),
    );
    formData.set(
      "subCategoryIds",
      JSON.stringify(selectedSubCategoryIds.map(Number)),
    );

    startTransition(async () => {
      const result = isEditing
        ? await updateBrand(brand.brand_id, formData)
        : await createBrand(formData);

      if (result.success) {
        toast.success(isEditing ? "Brand updated" : "Brand created");
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
      title={isEditing ? "Edit Brand" : "Add Brand"}
      description={
        isEditing ? "Update the brand details." : "Create a new brand."
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Brand Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Caterpillar"
              defaultValue={brand?.name ?? ""}
              errorMessage="Brand name is required"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Attachment Categories</FieldLabel>
          <FieldContent>
            <MultiSelect
              options={categoryOptions}
              defaultValue={selectedCategoryIds}
              onValueChange={setSelectedCategoryIds}
              placeholder="Select attachment categories..."
              maxCount={3}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Equipment Sub-Categories</FieldLabel>
          <FieldContent>
            <MultiSelect
              options={subCategoryOptions}
              defaultValue={selectedSubCategoryIds}
              onValueChange={setSelectedSubCategoryIds}
              placeholder="Select equipment sub-categories..."
              maxCount={3}
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
