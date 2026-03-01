"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  Search,
  ChevronsDownUp,
  ChevronsUpDown,
  Tag,
  Wrench,
  Package,
  Plus,
  FileText,
  FileSpreadsheet,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FilterPicker,
  ActiveFilterChips,
} from "@/components/ui/data-table-filter";
import { useDataTableFilters } from "@/hooks/use-data-table-filters";
import { useHasPermission } from "@/hooks/use-permissions";
import { BrandForm } from "./brand-form";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { deleteBrand } from "@/lib/actions/brand";
import { cn } from "@/lib/utils";
import type { FilterConfig } from "@/types/data-table-filters";
import type { ProductBrandWithCategories } from "@/types/brand";
import type { AttachmentCategory } from "@/types/attachment";
import type {
  EquipmentMainCategory,
  EquipmentSubCategory,
} from "@/types/equipment";

interface BrandTreeProps {
  brands: ProductBrandWithCategories[];
  categories: AttachmentCategory[];
  subCategories: EquipmentSubCategory[];
  mainCategories: EquipmentMainCategory[];
  linkedInfo: Record<number, { total: number; summary: string }>;
  onAdd?: () => void;
}

interface EquipmentGroup {
  mainCategoryName: string;
  subCategoryNames: string[];
}

interface TreeBrand {
  brand: ProductBrandWithCategories;
  equipment: EquipmentGroup[];
  attachmentNames: string[];
}

export function BrandTree({
  brands,
  categories,
  subCategories,
  mainCategories,
  linkedInfo,
  onAdd,
}: BrandTreeProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingBrand, setEditingBrand] = useState<ProductBrandWithCategories | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<TreeBrand | null>(null);
  const [isPending, startTransition] = useTransition();
  const canEdit = useHasPermission("brands", "edit");
  const canDelete = useHasPermission("brands", "delete");

  // Filter config + hook (reuses the same nested-click filter UI as listings)
  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "equipment_category",
        label: "Equipment Category",
        type: "multi-select",
        options: mainCategories.map((mc) => ({
          label: mc.name,
          value: mc.name,
        })),
      },
      {
        columnId: "attachment_category",
        label: "Attachment Category",
        type: "multi-select",
        options: categories.map((c) => ({ label: c.name, value: c.name })),
      },
    ],
    [mainCategories, categories],
  );

  const filterHook = useDataTableFilters({
    filters: filterConfig,
    storageKey: "brands-tree-filters",
  });

  const facetedValues = useMemo(
    () => ({ uniqueValues: {}, minMaxValues: {} }),
    [],
  );

  // Build lookup maps
  const lookups = useMemo(() => {
    const subCatMap = new Map(
      subCategories.map((sc) => [sc.sub_category_id, sc]),
    );
    const mainCatMap = new Map(
      mainCategories.map((mc) => [mc.category_id, mc.name]),
    );
    const catMap = new Map(
      categories.map((c) => [c.category_id, c.name]),
    );
    return { subCatMap, mainCatMap, catMap };
  }, [subCategories, mainCategories, categories]);

  // Build tree structure
  const tree = useMemo<TreeBrand[]>(() => {
    return brands.map((brand) => {
      // Group sub-categories by main category
      const groupMap = new Map<string, string[]>();
      for (const scId of brand.subCategoryIds) {
        const sc = lookups.subCatMap.get(scId);
        if (!sc) continue;
        const mainName = lookups.mainCatMap.get(sc.category_id) ?? "Other";
        if (!groupMap.has(mainName)) groupMap.set(mainName, []);
        groupMap.get(mainName)!.push(sc.name);
      }

      const equipment: EquipmentGroup[] = Array.from(groupMap.entries()).map(
        ([mainCategoryName, subCategoryNames]) => ({
          mainCategoryName,
          subCategoryNames,
        }),
      );

      // Attachment category names
      const attachmentNames = (brand.categoryIds ?? [])
        .map((id) => lookups.catMap.get(id))
        .filter(Boolean) as string[];

      return { brand, equipment, attachmentNames };
    });
  }, [brands, lookups]);

  // Filtering
  const isSearching = search.trim().length > 0;
  const hasFilters = filterHook.activeFilterCount > 0;
  const hasActiveFiltering = isSearching || hasFilters;

  const eqFilter =
    (filterHook.activeFilters.equipment_category as string[]) ?? [];
  const attFilter =
    (filterHook.activeFilters.attachment_category as string[]) ?? [];

  const filteredTree = useMemo(() => {
    let result = tree;

    // Apply equipment category filter
    if (eqFilter.length > 0) {
      const eqSet = new Set(eqFilter);
      result = result.filter((node) =>
        node.equipment.some((grp) => eqSet.has(grp.mainCategoryName)),
      );
    }

    // Apply attachment category filter
    if (attFilter.length > 0) {
      const attSet = new Set(attFilter);
      result = result.filter((node) =>
        node.attachmentNames.some((name) => attSet.has(name)),
      );
    }

    // Apply text search
    if (isSearching) {
      const q = search.toLowerCase().trim();
      result = result.filter((node) => {
        if (node.brand.name.toLowerCase().includes(q)) return true;
        for (const grp of node.equipment) {
          if (grp.mainCategoryName.toLowerCase().includes(q)) return true;
          if (grp.subCategoryNames.some((n) => n.toLowerCase().includes(q)))
            return true;
        }
        if (node.attachmentNames.some((n) => n.toLowerCase().includes(q)))
          return true;
        return false;
      });
    }

    return result;
  }, [tree, search, isSearching, eqFilter, attFilter]);

  const activeBrands = hasActiveFiltering
    ? new Set(filteredTree.map((n) => n.brand.brand_id))
    : expanded;

  const activeGroups = hasActiveFiltering
    ? new Set(
        filteredTree.flatMap((n) => {
          const keys: string[] = [];
          if (n.equipment.length > 0) {
            keys.push(`${n.brand.brand_id}-eq`);
            for (const grp of n.equipment) {
              keys.push(`${n.brand.brand_id}-eq-${grp.mainCategoryName}`);
            }
          }
          if (n.attachmentNames.length > 0) {
            keys.push(`${n.brand.brand_id}-att`);
          }
          return keys;
        }),
      )
    : expandedGroups;

  function toggleBrand(id: number) {
    if (hasActiveFiltering) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleGroup(key: string) {
    if (hasActiveFiltering) return;
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // All group keys for expand-all calculation
  const allGroupKeys = useMemo(() => {
    const keys: string[] = [];
    for (const node of tree) {
      if (node.equipment.length > 0) {
        keys.push(`${node.brand.brand_id}-eq`);
        for (const grp of node.equipment) {
          keys.push(`${node.brand.brand_id}-eq-${grp.mainCategoryName}`);
        }
      }
      if (node.attachmentNames.length > 0) {
        keys.push(`${node.brand.brand_id}-att`);
      }
    }
    return keys;
  }, [tree]);

  const isAllExpanded =
    expanded.size === brands.length &&
    expandedGroups.size === allGroupKeys.length;

  function toggleExpandAll() {
    if (isAllExpanded) {
      setExpanded(new Set());
      setExpandedGroups(new Set());
    } else {
      setExpanded(new Set(brands.map((b) => b.brand_id)));
      setExpandedGroups(new Set(allGroupKeys));
    }
  }

  function clearAllFilters() {
    filterHook.clearAllFilters();
  }

  function handleDeleteBrand() {
    if (!deletingBrand) return;
    startTransition(async () => {
      const result = await deleteBrand(deletingBrand.brand.brand_id);
      if (result.success) {
        toast.success("Brand deleted");
        setDeletingBrand(null);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deletingLinked = deletingBrand
    ? linkedInfo[deletingBrand.brand.brand_id]
    : null;
  const deleteDescription = deletingBrand ? (
    deletingLinked && deletingLinked.total > 0 ? (
      <>
        <strong>&ldquo;{deletingBrand.brand.name}&rdquo;</strong> will be moved
        to the trash.
        <br />
        This brand is linked to <strong>{deletingLinked.summary}</strong>.
        Deleting it will remove the brand reference from those models.
      </>
    ) : (
      <>
        <strong>&ldquo;{deletingBrand.brand.name}&rdquo;</strong> will be moved
        to the trash.
        <br />
        You can restore it within 30 days.
      </>
    )
  ) : (
    ""
  );

  return (
    <div className="space-y-3">
      {/* Header: search + filter + expand/collapse */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search brands, categories, or types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter button (nested click-and-show) */}
        <FilterPicker
          filters={filterConfig}
          activeFilters={filterHook.activeFilters}
          onFilterChange={(columnId, value) =>
            filterHook.setFilter(columnId, value)
          }
          activeCount={filterHook.activeFilterCount}
          facetedValues={facetedValues}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={toggleExpandAll}
          disabled={hasActiveFiltering}
        >
          {isAllExpanded ? (
            <>
              <ChevronsDownUp className="size-3.5" /> Collapse All
            </>
          ) : (
            <>
              <ChevronsUpDown className="size-3.5" /> Expand All
            </>
          )}
        </Button>
        {onAdd && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Add Brand <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAdd}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/brands">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        filters={filterConfig}
        activeFilters={filterHook.activeFilters}
        onFilterChange={(columnId, value) =>
          filterHook.setFilter(columnId, value)
        }
        onRemoveFilter={filterHook.removeFilter}
        onClearAll={clearAllFilters}
        activeCount={filterHook.activeFilterCount}
        facetedValues={facetedValues}
      />

      {/* Summary */}
      <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Tag className="size-3.5 text-amber-500" /> {filteredTree.length} {filteredTree.length === 1 ? "brand" : "brands"}
      </div>

      {/* Tree */}
      {filteredTree.length > 0 ? (
        <div className="space-y-2">
          {filteredTree.map((node) => {
            const brandId = node.brand.brand_id;
            const isBrandExpanded = activeBrands.has(brandId);
            const hasContent =
              node.equipment.length > 0 || node.attachmentNames.length > 0;

            // Summary parts
            const eqCount = node.brand.subCategoryIds.length;
            const attCount = node.attachmentNames.length;
            const summaryParts: string[] = [];
            if (node.equipment.length > 0) summaryParts.push(`${node.equipment.length} equipment ${node.equipment.length === 1 ? "category" : "categories"}`);
            if (attCount > 0) summaryParts.push(`${attCount} attachment ${attCount === 1 ? "category" : "categories"}`);

            return (
              <div key={brandId} className="bg-card rounded-lg border">
                {/* ── Brand row (level 1) ── */}
                <div
                  className={cn(
                    "flex items-center transition-colors",
                    isBrandExpanded
                      ? "bg-muted/40 hover:bg-muted/60 rounded-t-lg"
                      : "hover:bg-muted/50 rounded-lg",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleBrand(brandId)}
                    className="flex flex-1 items-center gap-2.5 p-3 text-left"
                  >
                    <ChevronRight
                      className={cn(
                        "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
                        isBrandExpanded && "rotate-90",
                        !hasContent && "invisible",
                      )}
                    />
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                      <Tag className="size-3.5 text-amber-500" />
                    </div>
                    <span className="font-semibold">{node.brand.name}</span>
                    {summaryParts.length > 0 && (
                      <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                        {summaryParts.join(" · ")}
                      </span>
                    )}
                  </button>
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1 pr-3">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingBrand(node.brand)}
                          aria-label="Edit brand"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingBrand(node)}
                          aria-label="Delete brand"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Expanded: Equipment wrapper + Attachments (level 2) ── */}
                {isBrandExpanded && hasContent && (
                  <div className="border-t">
                    {/* Equipment wrapper group */}
                    {node.equipment.length > 0 && (() => {
                      const eqWrapperKey = `${brandId}-eq`;
                      const isEqWrapperExpanded = activeGroups.has(eqWrapperKey);

                      return (
                        <div>
                          {/* ── Equipment wrapper row (level 2) ── */}
                          <button
                            type="button"
                            onClick={() => toggleGroup(eqWrapperKey)}
                            className={cn(
                              "hover:bg-muted/30 flex w-full items-center gap-2 py-2.5 pl-9 pr-3 text-left transition-colors",
                              isEqWrapperExpanded && "bg-muted/20",
                            )}
                          >
                            <ChevronRight
                              className={cn(
                                "text-muted-foreground size-3.5 shrink-0 transition-transform duration-200",
                                isEqWrapperExpanded && "rotate-90",
                              )}
                            />
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                              <Wrench className="size-3 text-blue-500" />
                            </div>
                            <span className="text-sm font-medium">
                              Equipment
                            </span>
                            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                              {node.equipment.length}{" "}
                              {node.equipment.length === 1 ? "main category" : "main categories"}
                            </span>
                          </button>

                          {/* ── Equipment main categories (level 3) ── */}
                          {isEqWrapperExpanded && (
                            <div>
                              {node.equipment.map((grp) => {
                                const groupKey = `${brandId}-eq-${grp.mainCategoryName}`;
                                const isGroupExpanded = activeGroups.has(groupKey);

                                return (
                                  <div key={groupKey}>
                                    {/* ── Main category row (level 3) ── */}
                                    <button
                                      type="button"
                                      onClick={() => toggleGroup(groupKey)}
                                      className={cn(
                                        "hover:bg-muted/30 flex w-full items-center gap-2 py-2.5 pl-16 pr-3 text-left transition-colors",
                                        isGroupExpanded && "bg-muted/20",
                                      )}
                                    >
                                      <ChevronRight
                                        className={cn(
                                          "text-muted-foreground size-3.5 shrink-0 transition-transform duration-200",
                                          isGroupExpanded && "rotate-90",
                                        )}
                                      />
                                      <div className="flex size-5 shrink-0 items-center justify-center rounded bg-teal-500/10">
                                        <Folder className="size-2.5 text-teal-500" />
                                      </div>
                                      <span className="text-sm font-medium">
                                        {grp.mainCategoryName}
                                      </span>
                                      <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                                        {grp.subCategoryNames.length}{" "}
                                        {grp.subCategoryNames.length === 1 ? "subcategory" : "subcategories"}
                                      </span>
                                    </button>

                                    {/* ── Sub-category items (level 4) ── */}
                                    {isGroupExpanded && (
                                      <div className="bg-muted/10 py-1">
                                        {grp.subCategoryNames.map((name) => (
                                          <div
                                            key={name}
                                            className="text-muted-foreground flex items-center gap-2 py-1.5 pl-22 text-sm"
                                          >
                                            <div className="size-1.5 shrink-0 rounded-full bg-teal-500/40" />
                                            {name}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Attachments group (level 2 — unchanged) */}
                    {node.attachmentNames.length > 0 && (() => {
                      const attKey = `${brandId}-att`;
                      const isAttExpanded = activeGroups.has(attKey);

                      return (
                        <div>
                          {/* ── Attachments row (level 2) ── */}
                          <button
                            type="button"
                            onClick={() => toggleGroup(attKey)}
                            className={cn(
                              "hover:bg-muted/30 flex w-full items-center gap-2 py-2.5 pl-9 pr-3 text-left transition-colors",
                              isAttExpanded && "bg-muted/20",
                            )}
                          >
                            <ChevronRight
                              className={cn(
                                "text-muted-foreground size-3.5 shrink-0 transition-transform duration-200",
                                isAttExpanded && "rotate-90",
                              )}
                            />
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                              <Package className="size-3 text-violet-500" />
                            </div>
                            <span className="text-sm font-medium">
                              Attachments
                            </span>
                            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                              {node.attachmentNames.length}{" "}
                              {node.attachmentNames.length === 1 ? "category" : "categories"}
                            </span>
                          </button>

                          {/* ── Attachment items (level 3) ── */}
                          {isAttExpanded && (
                            <div className="bg-muted/10 py-1">
                              {node.attachmentNames.map((name) => (
                                <div
                                  key={name}
                                  className="text-muted-foreground flex items-center gap-2 py-1.5 pl-16 text-sm"
                                >
                                  <div className="size-1.5 shrink-0 rounded-full bg-violet-500/40" />
                                  {name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {isSearching
              ? "No brands match your search"
              : "No brands yet"}
          </p>
          {isSearching && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setSearch("")}
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Edit form dialog */}
      {editingBrand && (
        <BrandForm
          open={!!editingBrand}
          onOpenChange={(open) => {
            if (!open) setEditingBrand(null);
          }}
          brand={editingBrand}
          categories={categories}
          subCategories={subCategories}
          brandCategoryIds={editingBrand.categoryIds}
          brandSubCategoryIds={editingBrand.subCategoryIds}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingBrand && (
        <DeleteDialog
          open={!!deletingBrand}
          onOpenChange={(open) => {
            if (!open) setDeletingBrand(null);
          }}
          onConfirm={handleDeleteBrand}
          title="Delete brand?"
          description={deleteDescription}
          isPending={isPending}
        />
      )}
    </div>
  );
}
