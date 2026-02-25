"use client";

import { useState, useMemo, useTransition } from "react";
import { Cog, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput, FieldError } from "@/components/ui/required-input";
import { PdfInput } from "@/components/ui/pdf-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createEquipmentModel,
  updateEquipmentModel,
} from "@/lib/actions/equipment-model";
import type { EquipmentModel, EquipmentMainCategory, EquipmentSubCategory } from "@/types/equipment";
import type { ProductBrand } from "@/types/brand";

interface EquipmentModelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: EquipmentModel;
  mainCategories: EquipmentMainCategory[];
  subCategories: EquipmentSubCategory[];
  brands: ProductBrand[];
  subCategoryBrandLinks: { sub_category_id: number; brand_id: number }[];
}

export function EquipmentModelForm({
  open,
  onOpenChange,
  model,
  mainCategories,
  subCategories,
  brands,
  subCategoryBrandLinks,
}: EquipmentModelFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!model;

  // ID ↔ name lookup maps
  const subCategoryMap = new Map(
    subCategories.map((sc) => [sc.name, sc.sub_category_id]),
  );
  const subCategoryIdToName = new Map(
    subCategories.map((sc) => [sc.sub_category_id, sc.name]),
  );
  const brandMap = new Map(brands.map((b) => [b.name, b.brand_id]));
  const brandIdToName = new Map(brands.map((b) => [b.brand_id, b.name]));

  // Build bi-directional link sets: subCategoryId → Set<brandId>, brandId → Set<subCategoryId>
  const brandsBySubCategory = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const link of subCategoryBrandLinks) {
      let set = map.get(link.sub_category_id);
      if (!set) {
        set = new Set();
        map.set(link.sub_category_id, set);
      }
      set.add(link.brand_id);
    }
    return map;
  }, [subCategoryBrandLinks]);

  const subCategoriesByBrand = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const link of subCategoryBrandLinks) {
      let set = map.get(link.brand_id);
      if (!set) {
        set = new Set();
        map.set(link.brand_id, set);
      }
      set.add(link.sub_category_id);
    }
    return map;
  }, [subCategoryBrandLinks]);

  // All names (unfiltered – shown when nothing is selected)
  const allSubCategoryNames = useMemo(
    () => subCategories.map((sc) => sc.name),
    [subCategories],
  );
  const allBrandNames = useMemo(() => brands.map((b) => b.name), [brands]);

  // Default values for edit mode
  const defaultSubCategoryName = model
    ? (subCategoryIdToName.get(model.sub_category_id) ?? "")
    : "";
  const defaultBrandName = model?.brand_id
    ? (brandIdToName.get(model.brand_id) ?? "")
    : "";

  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(
    defaultSubCategoryName,
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(defaultBrandName);

  // Filtered lists based on current selection
  const filteredSubCategoryNames = useMemo(() => {
    if (!selectedBrand) return allSubCategoryNames;
    const brandId = brandMap.get(selectedBrand);
    if (!brandId) return allSubCategoryNames;
    const linkedSubCatIds = subCategoriesByBrand.get(brandId);
    if (!linkedSubCatIds) return [];
    return subCategories
      .filter((sc) => linkedSubCatIds.has(sc.sub_category_id))
      .map((sc) => sc.name);
  }, [selectedBrand, allSubCategoryNames, brandMap, subCategoriesByBrand, subCategories]);

  // Group filtered sub-categories by main category for the scrollable grouped dropdown
  const groupedSubCategories = useMemo(() => {
    const mainCatIdToName = new Map(
      mainCategories.map((mc) => [mc.category_id, mc.name]),
    );
    const filteredSet = new Set(filteredSubCategoryNames);
    const groups = new Map<string, { name: string; id: number }[]>();

    for (const sc of subCategories) {
      if (!filteredSet.has(sc.name)) continue;
      const groupName = mainCatIdToName.get(sc.category_id) ?? "Other";
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push({ name: sc.name, id: sc.sub_category_id });
    }

    return groups;
  }, [filteredSubCategoryNames, subCategories, mainCategories]);

  const filteredBrandNames = useMemo(() => {
    if (!selectedSubCategory) return allBrandNames;
    const subCatId = subCategoryMap.get(selectedSubCategory);
    if (!subCatId) return allBrandNames;
    const linkedBrandIds = brandsBySubCategory.get(subCatId);
    if (!linkedBrandIds) return [];
    return brands
      .filter((b) => linkedBrandIds.has(b.brand_id))
      .map((b) => b.name);
  }, [selectedSubCategory, allBrandNames, subCategoryMap, brandsBySubCategory, brands]);

  const handleSubCategoryChange = (val: string | null) => {
    const newSubCat = val ?? "";
    setSelectedSubCategory(newSubCat);

    // Clear brand if it's no longer valid for the new sub-category
    if (selectedBrand && newSubCat) {
      const subCatId = subCategoryMap.get(newSubCat);
      const brandId = brandMap.get(selectedBrand);
      if (subCatId && brandId) {
        const linkedBrandIds = brandsBySubCategory.get(subCatId);
        if (linkedBrandIds && linkedBrandIds.size > 0 && !linkedBrandIds.has(brandId)) {
          setSelectedBrand("");
        }
      }
    }
  };

  const handleBrandChange = (val: string | null) => {
    const newBrand = val ?? "";
    setSelectedBrand(newBrand);

    // Clear sub-category if it's no longer valid for the new brand
    if (selectedSubCategory && newBrand) {
      const brandId = brandMap.get(newBrand);
      const subCatId = subCategoryMap.get(selectedSubCategory);
      if (brandId && subCatId) {
        const linkedSubCatIds = subCategoriesByBrand.get(brandId);
        if (linkedSubCatIds && linkedSubCatIds.size > 0 && !linkedSubCatIds.has(subCatId)) {
          setSelectedSubCategory("");
        }
      }
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedSubCategory(defaultSubCategoryName);
      setSelectedBrand(defaultBrandName);
    }
    onOpenChange(nextOpen);
  };

  function handleSubmit(formData: FormData) {
    const brandId = brandMap.get(selectedBrand);
    const subCategoryId = subCategoryMap.get(selectedSubCategory);
    if (!brandId || !subCategoryId) return;

    formData.set("brand_id", brandId.toString());
    formData.set("sub_category_id", subCategoryId.toString());

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
      icon={
        isEditing
          ? <Pencil className="text-primary-foreground size-6" />
          : <Cog className="text-primary-foreground size-6" />
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
          <FieldLabel>Brand</FieldLabel>
          <FieldContent>
            <div className="space-y-1">
              <Combobox
                value={selectedBrand}
                onValueChange={handleBrandChange}
                items={filteredBrandNames}
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
              <FieldError show={!selectedBrand} message="Please select a brand" />
            </div>
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Sub Category</FieldLabel>
          <FieldContent>
            <div className="space-y-1">
              <Combobox
                value={selectedSubCategory}
                onValueChange={handleSubCategoryChange}
                items={filteredSubCategoryNames}
              >
                <ComboboxInput
                  placeholder="Search sub category…"
                  showClear={!!selectedSubCategory}
                />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxEmpty>No sub category found</ComboboxEmpty>
                    {Array.from(groupedSubCategories.entries()).map(
                      ([groupName, items]) => (
                        <ComboboxGroup key={groupName}>
                          <ComboboxLabel>{groupName}</ComboboxLabel>
                          {items.map((item) => (
                            <ComboboxItem key={item.id} value={item.name}>
                              {item.name}
                            </ComboboxItem>
                          ))}
                        </ComboboxGroup>
                      ),
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldError show={!selectedSubCategory} message="Please select a sub category" />
            </div>
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
