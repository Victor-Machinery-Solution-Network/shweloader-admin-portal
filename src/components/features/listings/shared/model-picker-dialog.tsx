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
  // Attachment-category ↔ equipment-subcategory tags (optional cascade filter)
  attachmentCategorySubCategoryLinks: { category_id: number; sub_category_id: number }[];
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
  attachmentCategorySubCategoryLinks,
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

  // Optional cascade: equipment-subcategory → set of attachment-category ids.
  const attachCategoriesBySubCategory = useMemo(
    () =>
      buildLinkMap(
        attachmentCategorySubCategoryLinks,
        (l) => l.sub_category_id,
        (l) => l.category_id,
      ),
    [attachmentCategorySubCategoryLinks],
  );

  // Attachment mode only: scope the Brand and Equipment-Subcategory option lists
  // to what actually relates to attachments — brands that have at least one
  // attachment category (attachment_category_brand), and equipment subcategories
  // tagged to at least one attachment category (attachment_category_sub_category).
  const attachmentBrandNames = useMemo(
    () => brands.filter((b) => attachCategoriesByBrand.has(b.brand_id)).map((b) => b.name),
    [brands, attachCategoriesByBrand],
  );
  const attachmentSubCategoryNames = useMemo(
    () =>
      subCategories
        .filter((sc) => attachCategoriesBySubCategory.has(sc.sub_category_id))
        .map((sc) => sc.name),
    [subCategories, attachCategoriesBySubCategory],
  );

  // ── Internal selection state ──────────────────────────────────────────────
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(""); // sub-category for equipment, category for attachment
  const [selectedModel, setSelectedModel] = useState("");
  // Attachment mode only: equipment-subcategory filter that drives the picker —
  // when set it narrows the Category, Brand and Model lists to what's tagged
  // with / reachable from that subcategory. Blank = show everything.
  const [attachSubCategoryFilter, setAttachSubCategoryFilter] = useState("");

  // Pre-populate from current model when dialog opens — prev-state pattern so
  // the form is ready synchronously on the open render (no flash of empty state).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      // The optional attachment-subcategory filter always starts blank (show
      // all) on open, even when editing an existing attachment listing.
      setAttachSubCategoryFilter("");
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
    if (productType === "equipment") {
      if (!selectedCategory) return allBrandNames;
      const subCatId = subCategoryMap.get(selectedCategory);
      if (!subCatId) return allBrandNames;
      const linked = brandsBySubCategory.get(subCatId);
      if (!linked) return [];
      return brands.filter((b) => linked.has(b.brand_id)).map((b) => b.name);
    }

    // Attachment mode — most specific selection wins:
    //   1. a chosen Category → brands linked to that category
    //   2. else an Equipment-Subcategory filter → union of brands across every
    //      attachment category tagged with that subcategory
    //   3. else the full attachment-brand base
    if (selectedCategory) {
      const catId = attachCategoryMap.get(selectedCategory);
      if (!catId) return attachmentBrandNames;
      const linked = brandsByAttachCategory.get(catId);
      if (!linked) return [];
      return brands.filter((b) => linked.has(b.brand_id)).map((b) => b.name);
    }
    if (attachSubCategoryFilter) {
      const subId = subCategoryMap.get(attachSubCategoryFilter);
      if (!subId) return attachmentBrandNames;
      const cats = attachCategoriesBySubCategory.get(subId);
      if (!cats || cats.size === 0) return [];
      const allowed = new Set<number>();
      for (const catId of cats) {
        const linked = brandsByAttachCategory.get(catId);
        if (linked) for (const bId of linked) allowed.add(bId);
      }
      return brands.filter((b) => allowed.has(b.brand_id)).map((b) => b.name);
    }
    return attachmentBrandNames;
  }, [selectedCategory, attachSubCategoryFilter, productType, allBrandNames, attachmentBrandNames, brands, subCategoryMap, brandsBySubCategory, attachCategoryMap, brandsByAttachCategory, attachCategoriesBySubCategory]);

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
      // Optional equipment-subcategory filter: when set, restrict to the tagged
      // attachment categories; when blank, show all (current behaviour).
      const subFilterId = attachSubCategoryFilter
        ? subCategoryMap.get(attachSubCategoryFilter)
        : null;
      const subFilterSet = subFilterId
        ? attachCategoriesBySubCategory.get(subFilterId)
        : null;
      // Brand filter (independent of the subcategory filter).
      const brandId = selectedBrand ? brandMap.get(selectedBrand) : null;
      const brandSet = brandId ? attachCategoriesByBrand.get(brandId) : null;

      return attachmentCategories
        .filter((c) => {
          if (subFilterId && !(subFilterSet?.has(c.category_id))) return false;
          if (selectedBrand && brandId && !(brandSet?.has(c.category_id)))
            return false;
          return true;
        })
        .map((c) => c.name);
    }
  }, [selectedBrand, productType, allSubCategoryNames, brandMap, subCategoriesByBrand, subCategories, attachCategoriesByBrand, attachmentCategories, attachSubCategoryFilter, subCategoryMap, attachCategoriesBySubCategory]);

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
      // When an Equipment-Subcategory filter is active and no explicit category
      // is chosen, restrict to models whose attachment category is tagged with
      // that subcategory (same cascade the Brand list uses).
      let subFilterCats: Set<number> | null = null;
      if (!catId && attachSubCategoryFilter) {
        const subId = subCategoryMap.get(attachSubCategoryFilter);
        subFilterCats = subId
          ? (attachCategoriesBySubCategory.get(subId) ?? new Set<number>())
          : null;
      }
      return attachmentModels
        .filter((m) => {
          if (brandId && m.brand_id !== brandId) return false;
          if (catId && m.category_id !== catId) return false;
          if (subFilterCats && !subFilterCats.has(m.category_id)) return false;
          return true;
        })
        .map((m) => m.name);
    }
  }, [selectedBrand, selectedCategory, attachSubCategoryFilter, productType, brandMap, subCategoryMap, attachCategoryMap, attachCategoriesBySubCategory, equipmentModels, attachmentModels]);

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

  // Attachment mode: change the equipment-subcategory filter. Blank = show all
  // (clears nothing). When a subcategory is chosen it drives the whole picker,
  // so drop any currently-selected Category or Brand that isn't reachable from
  // it: the Category must be tagged with the subcategory, and the Brand must
  // belong to at least one attachment category tagged with it. Anything dropped
  // also clears the model.
  function handleAttachSubCategoryFilterChange(val: string | null) {
    const newFilter = val ?? "";
    setAttachSubCategoryFilter(newFilter);

    if (!newFilter) return;
    const subCatId = subCategoryMap.get(newFilter);
    if (!subCatId) return;
    const allowedCats = attachCategoriesBySubCategory.get(subCatId);

    // Drop a selected attachment category that isn't tagged with the subcategory.
    if (selectedCategory) {
      const catId = attachCategoryMap.get(selectedCategory);
      if (catId && !allowedCats?.has(catId)) {
        setSelectedCategory("");
        setSelectedModel("");
      }
    }

    // Drop a selected brand that doesn't belong to any tagged attachment category.
    if (selectedBrand) {
      const brandId = brandMap.get(selectedBrand);
      const brandCats = brandId ? attachCategoriesByBrand.get(brandId) : null;
      const stillValid =
        !!allowedCats &&
        !!brandCats &&
        [...brandCats].some((c) => allowedCats.has(c));
      if (!stillValid) {
        setSelectedBrand("");
        setSelectedModel("");
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

            {productType === "attachment" && (
              <Field orientation="vertical">
                <FieldLabel>Equipment Subcategory</FieldLabel>
                <FieldContent>
                  <SubCategoryCombobox
                    value={attachSubCategoryFilter}
                    onValueChange={handleAttachSubCategoryFilterChange}
                    subCategories={subCategories}
                    mainCategories={mainCategories}
                    allowedNames={attachmentSubCategoryNames}
                  />
                </FieldContent>
              </Field>
            )}

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
