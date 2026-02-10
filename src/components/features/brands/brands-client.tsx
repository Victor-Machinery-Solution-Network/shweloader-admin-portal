"use client";

import { useState, useCallback, useMemo } from "react";
import { Tag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { BrandForm } from "./brand-form";
import { createColumns } from "./columns";
import {
  deleteBrands,
  getLinkedCounts,
  formatLinkedSummary,
} from "@/lib/actions/brand";
import type { ProductBrandWithCategories } from "@/types/brand";
import type { AttachmentCategory } from "@/types/attachment";
import type { EquipmentSubCategory } from "@/types/equipment";

interface BrandsClientProps {
  brands: ProductBrandWithCategories[];
  categories: AttachmentCategory[];
  subCategories: EquipmentSubCategory[];
}

export function BrandsClient({
  brands,
  categories,
  subCategories,
}: BrandsClientProps) {
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(
    () => createColumns(categories, subCategories),
    [categories, subCategories],
  );

  const buildDescription = useCallback(
    async (selected: ProductBrandWithCategories[]) => {
      const ids = selected.map((b) => b.brand_id);
      const counts = await getLinkedCounts(ids);

      const names = selected.map((b) => `"${b.name}"`).join(", ");
      let msg = `This will permanently delete ${selected.length === 1 ? names : `${selected.length} brands (${names})`}.`;

      // Aggregate totals across all selected brands
      const totals = {
        equipmentModels: 0,
        attachmentModels: 0,
        attachmentCategories: 0,
        equipmentSubCategories: 0,
        total: 0,
      };
      for (const c of Object.values(counts)) {
        totals.equipmentModels += c.equipmentModels;
        totals.attachmentModels += c.attachmentModels;
        totals.attachmentCategories += c.attachmentCategories;
        totals.equipmentSubCategories += c.equipmentSubCategories;
        totals.total += c.total;
      }

      if (totals.total > 0) {
        const summary = await formatLinkedSummary(totals);
        msg += ` There ${totals.total === 1 ? "is" : "are"} ${summary} linked to ${selected.length === 1 ? "this brand" : "these brands"}.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: ProductBrandWithCategories[]) => {
      const ids = selected.map((b) => b.brand_id);
      return deleteBrands(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: ProductBrandWithCategories[]) => (
      <BulkDeleteButton
        selectedRows={selected}
        onDelete={handleBulkDelete}
        buildDescription={buildDescription}
        itemLabel="brand"
      />
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      <PageHeader title="Brands" description="Manage product brands">
        <Button onClick={() => setShowCreate(true)}>
          <Plus /> Add Brand
        </Button>
      </PageHeader>

      {brands.length > 0 ? (
        <DataTable
          columns={columns}
          data={brands}
          searchKey="name"
          searchPlaceholder="Search brands..."
          enableSelection
          enablePagination
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Tag}
          title="No brands yet"
          description="Get started by creating your first product brand."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Brand
            </Button>
          }
        />
      )}

      <BrandForm
        open={showCreate}
        onOpenChange={setShowCreate}
        categories={categories}
        subCategories={subCategories}
      />
    </>
  );
}
