"use client";

import { useState, useMemo, useTransition } from "react";
import { Box, Pencil } from "lucide-react";
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
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createAttachmentModel,
  updateAttachmentModel,
} from "@/lib/actions/attachment-model";
import type { AttachmentModel, AttachmentCategory } from "@/types/attachment";
import type { ProductBrand } from "@/types/brand";

interface AttachmentModelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: AttachmentModel;
  categories: AttachmentCategory[];
  brands: ProductBrand[];
  categoryBrandLinks: { category_id: number; brand_id: number }[];
}

export function AttachmentModelForm({
  open,
  onOpenChange,
  model,
  categories,
  brands,
  categoryBrandLinks,
}: AttachmentModelFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const isEditing = !!model;

  // ID ↔ name lookup maps
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.name, c.category_id])),
    [categories],
  );
  const categoryIdToName = useMemo(
    () => new Map(categories.map((c) => [c.category_id, c.name])),
    [categories],
  );
  const brandMap = useMemo(
    () => new Map(brands.map((b) => [b.name, b.brand_id])),
    [brands],
  );
  const brandIdToName = useMemo(
    () => new Map(brands.map((b) => [b.brand_id, b.name])),
    [brands],
  );

  // Build bi-directional link sets: categoryId → Set<brandId>, brandId → Set<categoryId>
  const brandsByCategory = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const link of categoryBrandLinks) {
      let set = map.get(link.category_id);
      if (!set) {
        set = new Set();
        map.set(link.category_id, set);
      }
      set.add(link.brand_id);
    }
    return map;
  }, [categoryBrandLinks]);

  const categoriesByBrand = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const link of categoryBrandLinks) {
      let set = map.get(link.brand_id);
      if (!set) {
        set = new Set();
        map.set(link.brand_id, set);
      }
      set.add(link.category_id);
    }
    return map;
  }, [categoryBrandLinks]);

  // All names (unfiltered – shown when nothing is selected)
  const allCategoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );
  const allBrandNames = useMemo(() => brands.map((b) => b.name), [brands]);

  // Default values for edit mode
  const defaultCategoryName = model
    ? (categoryIdToName.get(model.category_id) ?? "")
    : "";
  const defaultBrandName = model?.brand_id
    ? (brandIdToName.get(model.brand_id) ?? "")
    : "";

  const [selectedCategory, setSelectedCategory] = useState<string>(
    defaultCategoryName,
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(defaultBrandName);

  // Filtered lists based on current selection
  const filteredCategoryNames = useMemo(() => {
    if (!selectedBrand) return allCategoryNames;
    const brandId = brandMap.get(selectedBrand);
    if (!brandId) return allCategoryNames;
    const linkedCatIds = categoriesByBrand.get(brandId);
    if (!linkedCatIds) return [];
    return categories
      .filter((c) => linkedCatIds.has(c.category_id))
      .map((c) => c.name);
  }, [selectedBrand, allCategoryNames, brandMap, categoriesByBrand, categories]);

  const filteredBrandNames = useMemo(() => {
    if (!selectedCategory) return allBrandNames;
    const catId = categoryMap.get(selectedCategory);
    if (!catId) return allBrandNames;
    const linkedBrandIds = brandsByCategory.get(catId);
    if (!linkedBrandIds) return [];
    return brands
      .filter((b) => linkedBrandIds.has(b.brand_id))
      .map((b) => b.name);
  }, [selectedCategory, allBrandNames, categoryMap, brandsByCategory, brands]);

  const handleCategoryChange = (val: string | null) => {
    const newCat = val ?? "";
    setSelectedCategory(newCat);

    // Clear brand if it's no longer valid for the new category
    if (selectedBrand && newCat) {
      const catId = categoryMap.get(newCat);
      const brandId = brandMap.get(selectedBrand);
      if (catId && brandId) {
        const linkedBrandIds = brandsByCategory.get(catId);
        if (linkedBrandIds && linkedBrandIds.size > 0 && !linkedBrandIds.has(brandId)) {
          setSelectedBrand("");
        }
      }
    }
  };

  const handleBrandChange = (val: string | null) => {
    const newBrand = val ?? "";
    setSelectedBrand(newBrand);

    // Clear category if it's no longer valid for the new brand
    if (selectedCategory && newBrand) {
      const brandId = brandMap.get(newBrand);
      const catId = categoryMap.get(selectedCategory);
      if (brandId && catId) {
        const linkedCatIds = categoriesByBrand.get(brandId);
        if (linkedCatIds && linkedCatIds.size > 0 && !linkedCatIds.has(catId)) {
          setSelectedCategory("");
        }
      }
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedCategory(defaultCategoryName);
      setSelectedBrand(defaultBrandName);
    }
    onOpenChange(nextOpen);
  };

  function handleSubmit(formData: FormData) {
    const brandId = brandMap.get(selectedBrand);
    const categoryId = categoryMap.get(selectedCategory);
    if (!brandId || !categoryId) return;

    formData.set("brand_id", brandId.toString());
    formData.set("category_id", categoryId.toString());

    startTransition(async () => {
      const result = isEditing
        ? await updateAttachmentModel(model.model_id, formData)
        : await createAttachmentModel(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Attachment model updated" : "Attachment model created",
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
      title={isEditing ? "Edit Attachment Model" : "Add Attachment Model"}
      description={
        isEditing
          ? "Update the attachment model details."
          : "Create a new attachment model."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary-foreground size-6" />
          : <Box className="text-primary-foreground size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending || isUploading}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Model Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. HB20G"
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
          <FieldLabel>Category</FieldLabel>
          <FieldContent>
            <div className="space-y-1">
              <Combobox
                value={selectedCategory}
                onValueChange={handleCategoryChange}
                items={filteredCategoryNames}
              >
                <ComboboxInput
                  placeholder="Search category…"
                  showClear={!!selectedCategory}
                />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxEmpty>No category found</ComboboxEmpty>
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
              <FieldError show={!selectedCategory} message="Please select a category" />
            </div>
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>PDF Specification</FieldLabel>
          <FieldContent>
            <PdfInput
              name="pdf_url"
              value={model?.pdf_url ?? null}
              feature="attachment_models"
              permission={isEditing ? "edit" : "create"}
              onUploadingChange={setIsUploading}
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
