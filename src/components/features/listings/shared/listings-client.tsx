"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import { ShoppingCart, Home, Plus, Star, Filter, Check } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createSaleColumns, createRentColumns } from "./listing-columns";
import { featuredColumns } from "./featured-columns";
import { ListingForm } from "./listing-form";
import { reorderFeatured } from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  FeaturedListingWithDetails,
  ApprovedPartner,
} from "@/types/listing";
import type { EquipmentModel } from "@/types/equipment";
import type { AttachmentModel } from "@/types/attachment";
import type { Location } from "@/types/location";

type ListingRow = SaleListingWithDetails | RentListingWithDetails;

const PAGE_CONFIG = {
  sale: {
    icon: ShoppingCart,
    title: "Listings For Sale",
    description: "Manage sale listings and featured items",
    tabLabel: "Listings",
    emptyTitle: "No sale listings yet",
    emptyDescription: "Get started by creating your first sale listing.",
    hasSoldFilter: true,
  },
  rent: {
    icon: Home,
    title: "Listings For Rent",
    description: "Manage rental listings and featured items",
    tabLabel: "Listings",
    emptyTitle: "No rent listings yet",
    emptyDescription: "Get started by creating your first rental listing.",
    hasSoldFilter: false,
  },
} as const;

interface ListingsClientProps {
  pageType: "sale" | "rent";
  listings: ListingRow[];
  featured: FeaturedListingWithDetails[];
  partners: ApprovedPartner[];
  equipmentModels: EquipmentModel[];
  attachmentModels: AttachmentModel[];
  locations: Location[];
}

export function ListingsClient({
  pageType,
  listings,
  featured,
  partners,
  equipmentModels,
  attachmentModels,
  locations,
}: ListingsClientProps) {
  const config = PAGE_CONFIG[pageType];
  const Icon = config.icon;

  const columns = useMemo(() => {
    const factory = pageType === "sale" ? createSaleColumns : createRentColumns;
    // Cast is safe: the correct factory is always paired with matching data
    return factory(
      partners,
      equipmentModels,
      attachmentModels,
      locations,
    ) as ColumnDef<ListingRow>[];
  }, [pageType, partners, equipmentModels, attachmentModels, locations]);

  const [showCreate, setShowCreate] = useState(false);
  const [hiddenFilter, setHiddenFilter] = useState<
    "all" | "visible" | "hidden"
  >("all");
  const [soldFilter, setSoldFilter] = useState<"all" | "available" | "sold">(
    "all",
  );
  const [, startTransition] = useTransition();

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      if (hiddenFilter === "visible" && listing.is_hidden === 1) return false;
      if (hiddenFilter === "hidden" && listing.is_hidden === 0) return false;
      if (
        config.hasSoldFilter &&
        "is_sold_out" in listing &&
        soldFilter === "available" &&
        listing.is_sold_out === 1
      )
        return false;
      if (
        config.hasSoldFilter &&
        "is_sold_out" in listing &&
        soldFilter === "sold" &&
        listing.is_sold_out === 0
      )
        return false;
      return true;
    });
  }, [listings, hiddenFilter, soldFilter, config.hasSoldFilter]);

  const activeFilterCount =
    (hiddenFilter !== "all" ? 1 : 0) +
    (config.hasSoldFilter && soldFilter !== "all" ? 1 : 0);

  const filterToolbar = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="size-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Visibility</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setHiddenFilter("all")}>
            {hiddenFilter === "all" && <Check className="mr-2 size-4" />}
            <span className={hiddenFilter !== "all" ? "ml-6" : ""}>All</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setHiddenFilter("visible")}>
            {hiddenFilter === "visible" && <Check className="mr-2 size-4" />}
            <span className={hiddenFilter !== "visible" ? "ml-6" : ""}>
              Visible only
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setHiddenFilter("hidden")}>
            {hiddenFilter === "hidden" && <Check className="mr-2 size-4" />}
            <span className={hiddenFilter !== "hidden" ? "ml-6" : ""}>
              Hidden only
            </span>
          </DropdownMenuItem>

          {config.hasSoldFilter && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSoldFilter("all")}>
                {soldFilter === "all" && <Check className="mr-2 size-4" />}
                <span className={soldFilter !== "all" ? "ml-6" : ""}>All</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSoldFilter("available")}>
                {soldFilter === "available" && (
                  <Check className="mr-2 size-4" />
                )}
                <span className={soldFilter !== "available" ? "ml-6" : ""}>
                  Available only
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSoldFilter("sold")}>
                {soldFilter === "sold" && <Check className="mr-2 size-4" />}
                <span className={soldFilter !== "sold" ? "ml-6" : ""}>
                  Sold out only
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={() => setShowCreate(true)} className="ml-auto">
        <Plus /> Add Listing
      </Button>
    </>
  );

  const handleReorder = useCallback(
    (reordered: FeaturedListingWithDetails[]) => {
      const orderedItems = reordered.map((item, index) => ({
        id: item.id,
        display_order: String(index),
      }));
      startTransition(async () => {
        const result = await reorderFeatured(orderedItems);
        if (!result.success) {
          toast.error(result.error ?? "Failed to reorder");
        }
      });
    },
    [startTransition],
  );

  return (
    <>
      <PageHeader title={config.title} description={config.description} />

      <Tabs defaultValue="listings">
        <TabsList>
          <TabsTrigger value="listings">
            <Icon className="size-4" />
            {config.tabLabel}
          </TabsTrigger>
          <TabsTrigger value="featured">
            <Star className="size-4" />
            Featured Listings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          {listings.length > 0 ? (
            <DataTable
              columns={columns}
              data={filteredListings}
              searchKey="model_name"
              searchPlaceholder="Search by model..."
              enablePagination
              pageSize={10}
              toolbar={filterToolbar}
            />
          ) : (
            <EmptyState
              icon={Icon}
              title={config.emptyTitle}
              description={config.emptyDescription}
              action={
                <Button onClick={() => setShowCreate(true)}>
                  <Plus /> Add Listing
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="featured">
          {featured.length > 0 ? (
            <DataTable
              columns={featuredColumns}
              data={featured}
              enableDragSort
              getRowId={(row) => row.id}
              onReorder={handleReorder}
            />
          ) : (
            <EmptyState
              icon={Star}
              title="No featured listings"
              description="Feature a listing from the Listings tab to show it on the home page."
            />
          )}
        </TabsContent>
      </Tabs>

      <ListingForm
        open={showCreate}
        onOpenChange={setShowCreate}
        pageType={pageType}
        partners={partners}
        equipmentModels={equipmentModels}
        attachmentModels={attachmentModels}
        locations={locations}
      />
    </>
  );
}
