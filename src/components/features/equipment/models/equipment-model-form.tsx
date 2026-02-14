"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { PdfInput } from "@/components/ui/pdf-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
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
import {
  createEquipmentModel,
  updateEquipmentModel,
} from "@/lib/actions/equipment-model";
import type { EquipmentModel, EquipmentSubCategory } from "@/types/equipment";
import type { ProductBrand } from "@/types/brand";

interface EquipmentModelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: EquipmentModel;
  subCategories: EquipmentSubCategory[];
  brands: ProductBrand[];
}

export function EquipmentModelForm({
  open,
  onOpenChange,
  model,
  subCategories,
  brands,
}: EquipmentModelFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!model;

  const subCategoryMap = new Map(
    subCategories.map((sc) => [sc.name, sc.sub_category_id]),
  );
  const brandMap = new Map(brands.map((b) => [b.name, b.brand_id]));

  const subCategoryNames = useMemo(
    () => subCategories.map((sc) => sc.name),
    [subCategories],
  );
  const brandNames = useMemo(() => brands.map((b) => b.name), [brands]);

  const defaultSubCategoryName = model
    ? (subCategories.find((sc) => sc.sub_category_id === model.sub_category_id)
        ?.name ?? "")
    : "";
  const defaultBrandName = model?.brand_id
    ? (brands.find((b) => b.brand_id === model.brand_id)?.name ?? "")
    : "";

  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(
    defaultSubCategoryName,
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(defaultBrandName);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedSubCategory(defaultSubCategoryName);
      setSelectedBrand(defaultBrandName);
    }
    onOpenChange(nextOpen);
  };

  function handleSubmit(formData: FormData) {
    const subCategoryId = subCategoryMap.get(selectedSubCategory);
    if (!subCategoryId) {
      toast.error("Please select a sub category");
      return;
    }
    formData.set("sub_category_id", subCategoryId.toString());

    const brandId = brandMap.get(selectedBrand);
    if (brandId) {
      formData.set("brand_id", brandId.toString());
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateEquipmentModel(model.model_id, formData)
        : await createEquipmentModel(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Equipment model updated" : "Equipment model created",
        );
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
      title={isEditing ? "Edit Equipment Model" : "Add Equipment Model"}
      description={
        isEditing
          ? "Update the equipment model details."
          : "Create a new equipment model."
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Model Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. CAT 320"
              defaultValue={model?.name ?? ""}
              errorMessage="Model name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Sub Category</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedSubCategory}
              onValueChange={(val) => setSelectedSubCategory(val ?? "")}
              items={subCategoryNames}
            >
              <ComboboxInput
                placeholder="Search sub category…"
                showClear={!!selectedSubCategory}
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No sub category found</ComboboxEmpty>
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
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Brand</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedBrand}
              onValueChange={(val) => setSelectedBrand(val ?? "")}
              items={brandNames}
            >
              <ComboboxInput
                placeholder="Search brand…"
                showClear={!!selectedBrand}
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No brand found</ComboboxEmpty>
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
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>PDF Specification</FieldLabel>
          <FieldContent>
            <PdfInput name="pdf_url" value={model?.pdf_url ?? null} />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
