"use client";

import { useState, useMemo, useTransition } from "react";
import { ChevronDown, Pencil, Trash2, Tag, Wrench, Package } from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandForm } from "./brand-form";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { deleteBrand } from "@/lib/actions/brand";
import { formatDate } from "@/lib/utils";
import type { ProductBrandWithCategories } from "@/types/brand";
import type { AttachmentCategory } from "@/types/attachment";
import type { EquipmentMainCategory, EquipmentSubCategory } from "@/types/equipment";

interface GroupedCategory {
  mainCategoryName: string;
  subCategoryNames: string[];
}

interface BrandCardProps {
  brand: ProductBrandWithCategories;
  categories: AttachmentCategory[];
  subCategories: EquipmentSubCategory[];
  mainCategories: EquipmentMainCategory[];
  linkedCount: number;
  linkedSummary: string;
}

export function BrandCard({
  brand,
  categories,
  subCategories,
  mainCategories,
  linkedCount,
  linkedSummary,
}: BrandCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Build lookup maps
  const { grouped, attachmentNames, summary } = useMemo(() => {
    const subCatMap = new Map(
      subCategories.map((sc) => [sc.sub_category_id, sc]),
    );
    const mainCatMap = new Map(
      mainCategories.map((mc) => [mc.category_id, mc.name]),
    );
    const catMap = new Map(
      categories.map((c) => [c.category_id, c.name]),
    );

    // Group sub-categories by main category
    const groupMap = new Map<string, string[]>();
    for (const scId of brand.subCategoryIds) {
      const sc = subCatMap.get(scId);
      if (!sc) continue;
      const mainName = mainCatMap.get(sc.category_id) ?? "Other";
      if (!groupMap.has(mainName)) groupMap.set(mainName, []);
      groupMap.get(mainName)!.push(sc.name);
    }

    const grouped: GroupedCategory[] = Array.from(groupMap.entries()).map(
      ([mainCategoryName, subCategoryNames]) => ({
        mainCategoryName,
        subCategoryNames,
      }),
    );

    // Attachment category names
    const attachmentNames = (brand.categoryIds ?? [])
      .map((id) => catMap.get(id))
      .filter(Boolean) as string[];

    // Summary stats
    const parts: string[] = [];
    if (grouped.length > 0) {
      parts.push(`${grouped.length} ${grouped.length === 1 ? "category" : "categories"}`);
      parts.push(`${brand.subCategoryIds.length} ${brand.subCategoryIds.length === 1 ? "type" : "types"}`);
    }
    if (attachmentNames.length > 0) {
      parts.push(`${attachmentNames.length} ${attachmentNames.length === 1 ? "attachment" : "attachments"}`);
    }

    return { grouped, attachmentNames, summary: parts.join(" · ") };
  }, [brand, categories, subCategories, mainCategories]);

  const deleteDescription =
    linkedCount > 0 ? (
      <>
        <strong>&ldquo;{brand.name}&rdquo;</strong> will be moved to the trash.
        <br />
        This brand is linked to <strong>{linkedSummary}</strong>. Deleting it
        will remove the brand reference from those models.
      </>
    ) : (
      <>
        <strong>&ldquo;{brand.name}&rdquo;</strong> will be moved to the trash.
        <br />
        You can restore it within 30 days.
      </>
    );

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBrand(brand.brand_id);
      if (result.success) {
        toast.success("Brand deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="ring-foreground/10 bg-card rounded-2xl ring-1">
          {/* Collapsed header — always visible */}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="grid w-full cursor-pointer grid-cols-[minmax(0,500px)_1fr_auto] items-start gap-6 px-5 py-4 text-left"
            >
              <div className="flex items-center gap-2.5 pt-0.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                  <Tag className="size-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-base font-medium">{brand.name}</div>
                  {summary && (
                    <div className="text-muted-foreground text-sm">{summary}</div>
                  )}
                </div>
              </div>

              {/* Main category pills with counts */}
              <div className="flex flex-wrap justify-end gap-1.5">
                {grouped.map(({ mainCategoryName, subCategoryNames }) => (
                  <Badge key={mainCategoryName} variant="outline" className="text-xs gap-1.5">
                    {mainCategoryName}
                    <span className="text-muted-foreground">{subCategoryNames.length}</span>
                  </Badge>
                ))}
              </div>

              <ChevronDown
                className={`text-muted-foreground mt-1 size-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>

          {/* Expanded content */}
          <CollapsibleContent>
            <div className="border-border border-t px-5 py-4">
              {/* Equipment section */}
              {grouped.length > 0 && (
                <div className="mb-8">
                  <div className="text-muted-foreground mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
                    <Wrench className="size-3 text-blue-500" />
                    Equipment
                  </div>
                  <div className="space-y-2">
                    {grouped.map(({ mainCategoryName, subCategoryNames }) => (
                      <div key={mainCategoryName} className="flex gap-3 text-sm">
                        <span className="w-40 shrink-0 font-medium">
                          {mainCategoryName}
                        </span>
                        <span className="text-muted-foreground">
                          {subCategoryNames.join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments section */}
              {attachmentNames.length > 0 && (
                <div className="mb-4">
                  <div className="text-muted-foreground mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
                    <Package className="size-3 text-violet-500" />
                    Attachments
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {attachmentNames.map((name) => (
                      <Badge key={name} variant="outline" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer: date + actions */}
              <div className="border-border flex items-center justify-between border-t pt-3">
                <span className="text-muted-foreground text-sm">
                  Created {formatDate(brand.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEdit(true)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDelete(true)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {showEdit && (
        <BrandForm
          open={showEdit}
          onOpenChange={setShowEdit}
          brand={brand}
          categories={categories}
          subCategories={subCategories}
          brandCategoryIds={brand.categoryIds}
          brandSubCategoryIds={brand.subCategoryIds}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete brand?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
