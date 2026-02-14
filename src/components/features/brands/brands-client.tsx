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
  getBrandLinkedCounts,
  formatBrandLinkedSummary,
} from "@/lib/actions/brand";
import type { ProductBrandWithCategories } from "@/types/brand";
import type { AttachmentCategory } from "@/types/attachment";
import type { EquipmentSubCategory } from "@/types/equipment";

interface BrandsClientProps {
  brands: ProductBrandWithCategories[];
  categories: AttachmentCategory[];
  subCategories: EquipmentSubCategory[];
  linkedInfo: Record<number, { total: number; summary: string }>;
}

export function BrandsClient({
  brands,
  categories,
  subCategories,
  linkedInfo,
}: BrandsClientProps) {
  const [showCreate, setShowCreate] = useState(false);

  const columns = useMemo(
    () => createColumns(categories, subCategories, linkedInfo),
    [categories, subCategories, linkedInfo],
  );

  const handleBulkDelete = useCallback(
    async (selected: ProductBrandWithCategories[]) => {
      const ids = selected.map((b) => b.brand_id);
      return deleteBrands(ids);
    },
    [],
  );

  const buildDescription = useCallback(
    async (selected: ProductBrandWithCategories[]) => {
      const ids = selected.map((b) => b.brand_id);
      const counts = await getBrandLinkedCounts(ids);
      const totalLinked = Object.values(counts).reduce(
        (sum, c) => sum + c.total,
        0,
      );
      if (totalLinked > 0) {
        const parts = await Promise.all(
          Object.values(counts)
            .filter((c) => c.total > 0)
            .map((c) => formatBrandLinkedSummary(c)),
        );
        return `These brands are linked to ${parts.join("; ")}. Deleting will remove brand references from those models. This action cannot be undone.`;
      }
      const count = selected.length;
      const plural = count === 1 ? "brand" : "brands";
      return `This will permanently delete ${count} ${plural}. This action cannot be undone.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: ProductBrandWithCategories[]) => (
      <>
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          buildDescription={buildDescription}
          itemLabel="brand"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Add Brand
        </Button>
      </>
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      <PageHeader title="Brands" description="Manage product brands" />

      {brands.length > 0 ? (
        <DataTable
          columns={columns}
          data={brands}
          searchKey="name"
          searchPlaceholder="Search brands…"
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
