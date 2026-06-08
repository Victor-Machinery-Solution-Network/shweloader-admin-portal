"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { buildLinkMap } from "@/lib/utils";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { ComboboxPortalContext } from "@/components/ui/combobox";
import { SubCategoryCombobox } from "@/components/features/equipment/sub-category-combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { EquipmentModel, EquipmentMainCategory, EquipmentSubCategory } from "@/types/equipment";
import type { AttachmentModel, AttachmentCategory } from "@/types/attachment";
import type { ProductBrand } from "@/types/brand";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType: "equipment" | "attachment";
  brands: ProductBrand[];
  // Equipment data
  equipmentModels: EquipmentModel[];
  mainCategories: EquipmentMainCategory[];
  subCategories: EquipmentSubCategory[];
  subCategoryBrandLinks: { sub_category_id: number; brand_id: number }[];
  // Attachment data
  attachmentModels: AttachmentModel[];
  attachmentCategories: AttachmentCategory[];
  categoryBrandLinks: { category_id: number; brand_id: number }[];
  // Selection
  currentModel?: string;
  onSelect: (modelName: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ModelPickerDialog({
  open,
  onOpenChange,
  productType,
  brands,
  equipmentModels,
  mainCategories,
  subCategories,
  subCategoryBrandLinks,
  attachmentModels,
  attachmentCategories,
  categoryBrandLinks,
  currentModel,
  onSelect,
}: ModelPickerDialogProps) {
  // Portal container element for the combobox dropdown — stored as state via
  // callback ref so child Combobox can read it during render.
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  // ── Lookup maps ──────────────────────────────────────────────────────────
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.name, b.brand_id])), [brands]);
  const brandIdToName = useMemo(() => new Map(brands.map((b) => [b.brand_id, b.name])), [brands]);
  const allBrandNames = useMemo(() => brands.map((b) => b.name), [brands]);

  // Equipment lookups
  const subCategoryMap = useMemo(
    () => new Map(subCategories.map((sc) => [sc.name, sc.sub_category_id])),
    [subCategories],
  );
  const subCategoryIdToName = useMemo(
    () => new Map(subCategories.map((sc) => [sc.sub_category_id, sc.name])),
    [subCategories],
  );
  const allSubCategoryNames = useMemo(
    () => subCategories.map((sc) => sc.name),
    [subCategories],
  );

  // Attachment lookups
  const attachCategoryMap = useMemo(
    () => new Map(attachmentCategories.map((c) => [c.name, c.category_id])),
    [attachmentCategories],
  );
  const attachCategoryIdToName = useMemo(
    () => new Map(attachmentCategories.map((c) => [c.category_id, c.name])),
    [attachmentCategories],
  );
  const allAttachCategoryNames = useMemo(
    () => attachmentCategories.map((c) => c.name),
    [attachmentCategories],
  );

  // ── Bi-directional link maps (equipment) ─────────────────────────────────
  const brandsBySubCategory = useMemo(
    () => buildLinkMap(subCategoryBrandLinks, (l) => l.sub_category_id, (l) => l.brand_id),
    [subCategoryBrandLinks],
  );
  const subCategoriesByBrand = useMemo(
    () => buildLinkMap(subCategoryBrandLinks, (l) => l.brand_id, (l) => l.sub_category_id),
    [subCategoryBrandLinks],
  );

  // ── Bi-directional link maps (attachment) ─────────────────────────────────
  const brandsByAttachCategory = useMemo(
    () => buildLinkMap(categoryBrandLinks, (l) => l.category_id, (l) => l.brand_id),
    [categoryBrandLinks],
  );
  const attachCategoriesByBrand = useMemo(
    () => buildLinkMap(categoryBrandLinks, (l) => l.brand_id, (l) => l.category_id),
    [categoryBrandLinks],
  );

  // ── Internal selection state ──────────────────────────────────────────────
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(""); // sub-category for equipment, category for attachment
  const [selectedModel, setSelectedModel] = useState("");

  // Pre-populate from current model when dialog opens — prev-state pattern so
  // the form is ready synchronously on the open render (no flash of empty state).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      let matched = false;
      if (currentModel) {
        if (productType === "equipment") {
          const model = equipmentModels.find((m) => m.name === currentModel);
          if (model) {
            setSelectedBrand(model.brand_id ? (brandIdToName.get(model.brand_id) ?? "") : "");
            setSelectedCategory(subCategoryIdToName.get(model.sub_category_id) ?? "");
            setSelectedModel(currentModel);
            matched = true;
          }
        } else {
          const model = attachmentModels.find((m) => m.name === currentModel);
          if (model) {
            setSelectedBrand(model.brand_id ? (brandIdToName.get(model.brand_id) ?? "") : "");
            setSelectedCategory(attachCategoryIdToName.get(model.category_id) ?? "");
            setSelectedModel(currentModel);
            matched = true;
          }
        }
      }
      if (!matched) {
        setSelectedBrand("");
        setSelectedCategory("");
        setSelectedModel("");
      }
    }
  }

  // ── Filtered brand names ──────────────────────────────────────────────────
  const filteredBrandNames = useMemo(() => {
    if (!selectedCategory) return allBrandNames;
    if (productType === "equipment") {
      const subCatId = subCategoryMap.get(selectedCategory);
      if (!subCatId) return allBrandNames;
      const linked = brandsBySubCategory.get(subCatId);
      if (!linked) return [];
      return brands.filter((b) => linked.has(b.brand_id)).map((b) => b.name);
    } else {
      const catId = attachCategoryMap.get(selectedCategory);
      if (!catId) return allBrandNames;
      const linked = brandsByAttachCategory.get(catId);
      if (!linked) return [];
      return brands.filter((b) => linked.has(b.brand_id)).map((b) => b.name);
    }
  }, [selectedCategory, productType, allBrandNames, brands, subCategoryMap, brandsBySubCategory, attachCategoryMap, brandsByAttachCategory]);

  // ── Filtered category names ───────────────────────────────────────────────
  const filteredCategoryNames = useMemo(() => {
    if (productType === "equipment") {
      if (!selectedBrand) return allSubCategoryNames;
      const brandId = brandMap.get(selectedBrand);
      if (!brandId) return allSubCategoryNames;
      const linked = subCategoriesByBrand.get(brandId);
      if (!linked) return [];
      return subCategories.filter((sc) => linked.has(sc.sub_category_id)).map((sc) => sc.name);
    } else {
      if (!selectedBrand) return allAttachCategoryNames;
      const brandId = brandMap.get(selectedBrand);
      if (!brandId) return allAttachCategoryNames;
      const linked = attachCategoriesByBrand.get(brandId);
      if (!linked) return [];
      return attachmentCategories.filter((c) => linked.has(c.category_id)).map((c) => c.name);
    }
  }, [selectedBrand, productType, allSubCategoryNames, allAttachCategoryNames, brandMap, subCategoriesByBrand, subCategories, attachCategoriesByBrand, attachmentCategories]);

  // ── Filtered models (always populated — filters narrow progressively) ─────
  const filteredModelNames = useMemo(() => {
    const brandId = selectedBrand ? brandMap.get(selectedBrand) : null;

    if (productType === "equipment") {
      const subCatId = selectedCategory ? subCategoryMap.get(selectedCategory) : null;
      return equipmentModels
        .filter((m) => {
          if (brandId && m.brand_id !== brandId) return false;
          if (subCatId && m.sub_category_id !== subCatId) return false;
          return true;
        })
        .map((m) => m.name);
    } else {
      const catId = selectedCategory ? attachCategoryMap.get(selectedCategory) : null;
      return attachmentModels
        .filter((m) => {
          if (brandId && m.brand_id !== brandId) return false;
          if (catId && m.category_id !== catId) return false;
          return true;
        })
        .map((m) => m.name);
    }
  }, [selectedBrand, selectedCategory, productType, brandMap, subCategoryMap, attachCategoryMap, equipmentModels, attachmentModels]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleBrandChange(val: string | null) {
    const newBrand = val ?? "";
    setSelectedBrand(newBrand);
    setSelectedModel("");

    // Clear category if no longer valid
    if (selectedCategory && newBrand) {
      const brandId = brandMap.get(newBrand);
      if (productType === "equipment") {
        const subCatId = subCategoryMap.get(selectedCategory);
        if (brandId && subCatId) {
          const linked = subCategoriesByBrand.get(brandId);
          if (linked && linked.size > 0 && !linked.has(subCatId)) {
            setSelectedCategory("");
          }
        }
      } else {
        const catId = attachCategoryMap.get(selectedCategory);
        if (brandId && catId) {
          const linked = attachCategoriesByBrand.get(brandId);
          if (linked && linked.size > 0 && !linked.has(catId)) {
            setSelectedCategory("");
          }
        }
      }
    }
  }

  function handleCategoryChange(val: string | null) {
    const newCat = val ?? "";
    setSelectedCategory(newCat);
    setSelectedModel("");

    // Clear brand if no longer valid
    if (selectedBrand && newCat) {
      const brandId = brandMap.get(selectedBrand);
      if (productType === "equipment") {
        const subCatId = subCategoryMap.get(newCat);
        if (brandId && subCatId) {
          const linked = brandsBySubCategory.get(subCatId);
          if (linked && linked.size > 0 && !linked.has(brandId)) {
            setSelectedBrand("");
          }
        }
      } else {
        const catId = attachCategoryMap.get(newCat);
        if (brandId && catId) {
          const linked = brandsByAttachCategory.get(catId);
          if (linked && linked.size > 0 && !linked.has(brandId)) {
            setSelectedBrand("");
          }
        }
      }
    }
  }

  function handleConfirm() {
    if (selectedModel) {
      onSelect(selectedModel);
      onOpenChange(false);
    }
  }

  const categoryLabel = productType === "equipment" ? "Sub Category" : "Category";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] flex flex-col sm:max-w-md">
        <ComboboxPortalContext value={portalContainer}>
          <DialogHeader className="items-center text-center">
            <div className="bg-primary mx-auto flex size-12 items-center justify-center rounded-full">
              <Search className="text-primary-foreground size-6" />
            </div>
            <DialogTitle className="text-xl">Find Model</DialogTitle>
            <DialogDescription>
              Filter by brand and {categoryLabel.toLowerCase()} to find the model.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 p-1 pr-2.5">
            <Field orientation="vertical">
              <FieldLabel>Brand</FieldLabel>
              <FieldContent>
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
              </FieldContent>
            </Field>

            <Field orientation="vertical">
              <FieldLabel>{categoryLabel}</FieldLabel>
              <FieldContent>
                {productType === "equipment" ? (
                  <SubCategoryCombobox
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                    subCategories={subCategories}
                    mainCategories={mainCategories}
                    allowedNames={filteredCategoryNames}
                  />
                ) : (
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
                )}
              </FieldContent>
            </Field>

            <Field orientation="vertical">
              <FieldLabel>Model</FieldLabel>
              <FieldContent>
                <Combobox
                  value={selectedModel}
                  onValueChange={(val) => setSelectedModel(val ?? "")}
                  items={filteredModelNames}
                >
                  <ComboboxInput
                    placeholder="Search model…"
                    showClear={!!selectedModel}
                  />
                  <ComboboxContent>
                    <ComboboxList>
                      <ComboboxEmpty>No model found</ComboboxEmpty>
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
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedModel}
            >
              Select
            </Button>
          </DialogFooter>

          <div ref={setPortalContainer} className="absolute" />
        </ComboboxPortalContext>
      </DialogContent>
    </Dialog>
  );
}
