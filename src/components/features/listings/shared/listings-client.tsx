"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { ShoppingCart, Home, Plus, Pin, Filter, Clock } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EmptyState } from "@/components/shared/empty-state";

import { Tabs, TabsList, TabsTrigger, TabsContent, TabCount } from "@/components/ui/tabs";
import { createSaleColumns, createRentColumns } from "./listing-columns";
import {
  createPendingSaleColumns,
  createPendingRentColumns,
} from "./pending-listing-columns";
import { featuredColumns } from "./featured-columns";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  FeaturedListingWithDetails,
} from "@/types/listing";

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
}

export function ListingsClient({
  pageType,
  listings,
  featured,
}: ListingsClientProps) {
  const config = PAGE_CONFIG[pageType];
  const Icon = config.icon;

  const columns = useMemo(() => {
    const factory = pageType === "sale" ? createSaleColumns : createRentColumns;
    return factory() as ColumnDef<ListingRow>[];
  }, [pageType]);

  const pendingColumns = useMemo(() => {
    const factory =
      pageType === "sale" ? createPendingSaleColumns : createPendingRentColumns;
    return factory() as ColumnDef<ListingRow>[];
  }, [pageType]);

  // Split listings by approval status
  const approvedListings = useMemo(
    () =>
      listings.filter(
        (l) => !l.approve_status_name || l.approve_status_name === "Approved",
      ),
    [listings],
  );

  const pendingListings = useMemo(
    () => listings.filter((l) => l.approve_status_name === "Pending"),
    [listings],
  );

  const pendingCount = pendingListings.length;

  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") ?? "listings") as "listings" | "pending" | "featured";
  const hiddenFilter = (searchParams.get("visibility") ?? "all") as "all" | "visible" | "hidden";
  const soldFilter = (searchParams.get("sold") ?? "all") as "all" | "available" | "sold";

  const setParam = useCallback(
    (key: string, value: string, defaultValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [searchParams, router],
  );

  const setTab = useCallback((v: string) => setParam("tab", v, "listings"), [setParam]);
  const setHiddenFilter = useCallback((v: string) => setParam("visibility", v, "all"), [setParam]);
  const setSoldFilter = useCallback((v: string) => setParam("sold", v, "all"), [setParam]);

  const filteredListings = useMemo(() => {
    return approvedListings.filter((listing) => {
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
  }, [approvedListings, hiddenFilter, soldFilter, config.hasSoldFilter]);

  const activeFilterCount =
    (hiddenFilter !== "all" ? 1 : 0) +
    (config.hasSoldFilter && soldFilter !== "all" ? 1 : 0);

  const filterToolbar = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="size-3.5" aria-hidden="true" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Visibility</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={hiddenFilter} onValueChange={(v) => setHiddenFilter(v as typeof hiddenFilter)}>
            <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="visible">Visible only</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="hidden">Hidden only</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          {config.hasSoldFilter && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={soldFilter} onValueChange={(v) => setSoldFilter(v as typeof soldFilter)}>
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="available">Available only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sold">Sold out only</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={() => router.push(`/listings/for-${pageType}/new`)} className="ml-auto">
        <Plus aria-hidden="true" /> Add Listing
      </Button>
    </>
  );

  const { data: featuredData, handleReorder } = useDragReorder(featured, {
    getRowId: (r) => r.id,
    tableName: "featured_listing",
  });

  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="listings">
            <Icon className="size-4" aria-hidden="true" />
            {config.tabLabel}
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="size-4" aria-hidden="true" />
            Pending
            {pendingCount > 0 && (
              <TabCount>{pendingCount}</TabCount>
            )}
          </TabsTrigger>
          <TabsTrigger value="featured">
            <Pin className="size-4" aria-hidden="true" />
            Featured Listings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          {approvedListings.length > 0 ? (
            <DataTable
              columns={columns}
              data={filteredListings}
              searchKey="model_name"
              searchPlaceholder="Search by model"
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
                <Button onClick={() => router.push(`/listings/for-${pageType}/new`)}>
                  <Plus aria-hidden="true" /> Add Listing
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pendingListings.length > 0 ? (
            <DataTable
              columns={pendingColumns}
              data={pendingListings}
              searchKey="model_name"
              searchPlaceholder="Search pending listings"
              enablePagination
              pageSize={10}
            />
          ) : (
            <EmptyState
              icon={Clock}
              title="No pending listings"
              description="All listings have been reviewed."
            />
          )}
        </TabsContent>

        <TabsContent value="featured">
          {featuredData.length > 0 ? (
            <DataTable
              columns={featuredColumns}
              data={featuredData}
              enableDragSort
              getRowId={(row) => row.id}
              onReorder={handleReorder}
            />
          ) : (
            <EmptyState
              icon={Pin}
              title="No featured listings"
              description="Feature a listing from the Listings tab to show it on the home page."
            />
          )}
        </TabsContent>
      </Tabs>

    </>
  );
}
