"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag, Plus, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { BrandForm } from "./brand-form";
import { BrandTree } from "./brand-tree";
import type { ProductBrandWithCategories } from "@/types/brand";
import type { AttachmentCategory } from "@/types/attachment";
import type {
  EquipmentMainCategory,
  EquipmentSubCategory,
} from "@/types/equipment";

interface BrandsClientProps {
  brands: ProductBrandWithCategories[];
  categories: AttachmentCategory[];
  subCategories: EquipmentSubCategory[];
  mainCategories: EquipmentMainCategory[];
  linkedInfo: Record<number, { total: number; summary: string }>;
}

export function BrandsClient({
  brands,
  categories,
  subCategories,
  mainCategories,
  linkedInfo,
}: BrandsClientProps) {
  const canCreate = useHasPermission("brands", "create");
  const [showCreate, setShowCreate] = useState(false);

  if (brands.length === 0) {
    return (
      <>
        <EmptyState
          icon={Tag}
          title="No brands yet"
          description="Get started by creating your first product brand."
          action={
            canCreate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus /> Add Brand <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setShowCreate(true)}>
                    <FileText /> Fill Form
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bulk-upload/brands">
                      <FileSpreadsheet /> Excel Upload
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
        <BrandForm
          open={showCreate}
          onOpenChange={setShowCreate}
          categories={categories}
          subCategories={subCategories}
        />
      </>
    );
  }

  return (
    <>
      <BrandTree
        brands={brands}
        categories={categories}
        subCategories={subCategories}
        mainCategories={mainCategories}
        linkedInfo={linkedInfo}
        onAdd={canCreate ? () => setShowCreate(true) : undefined}
      />

      <BrandForm
        open={showCreate}
        onOpenChange={setShowCreate}
        categories={categories}
        subCategories={subCategories}
      />
    </>
  );
}
