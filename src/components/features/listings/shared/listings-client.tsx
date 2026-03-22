"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import Link from "next/link";
import { ShoppingCart, Home, Plus, Pin, Clock, ChevronDown, FileText, FileSpreadsheet, FileEdit, XCircle } from "lucide-react";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SESSION_KEYS } from "@/lib/constants";
import type { FilterConfig } from "@/types/data-table-filters";

import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { deleteSaleListings, deleteRentListings } from "@/lib/actions/listing";

import { Tabs, TabsList, TabsTrigger, TabsContent, TabCount } from "@/components/ui/tabs";
import { createSaleColumns, createRentColumns } from "./listing-columns";
import {
  createPendingSaleColumns,
  createPendingRentColumns,
  createReworkSaleColumns,
  createReworkRentColumns,
} from "./pending-listing-columns";
import { featuredColumns } from "./featured-columns";
import { createDraftColumns } from "./draft-columns";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { getDraftListings } from "@/lib/actions/listing";
import { Spinner } from "@/components/ui/spinner";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  FeaturedListingWithDetails,
  DraftListingWithDetails,
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
  },
  rent: {
    icon: Home,
    title: "Listings For Rent",
    description: "Manage rental listings and featured items",
    tabLabel: "Listings",
    emptyTitle: "No rent listings yet",
    emptyDescription: "Get started by creating your first rental listing.",
  },
} as const;

// Hidden filter-only columns — not rendered in the table
const HIDDEN_FILTER_COLUMNS: VisibilityState = {
  visibility: false,
  sold_status: false,
  rent_status: false,
  is_featured: false,
  mmk_price: false,
  created_at: false,
};

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
  const feature = pageType === "sale" ? "sale_listings" : "rent_listings";
  const canCreate = useHasPermission(feature, "create");
  const canDelete = useHasPermission(feature, "delete");

  const columns = useMemo(() => {
    const factory = pageType === "sale" ? createSaleColumns : createRentColumns;
    return factory() as ColumnDef<ListingRow>[];
  }, [pageType]);

  const pendingColumns = useMemo(() => {
    const factory =
      pageType === "sale" ? createPendingSaleColumns : createPendingRentColumns;
    return factory() as ColumnDef<ListingRow>[];
  }, [pageType]);

  const draftColumns = useMemo(() => createDraftColumns(), []);

  const reworkColumns = useMemo(() => {
    const factory =
      pageType === "sale" ? createReworkSaleColumns : createReworkRentColumns;
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
    () =>
      listings.filter((l) => l.approve_status_name === "Pending"),
    [listings],
  );

  const reworkListings = useMemo(
    () =>
      listings.filter((l) => l.approve_status_name === "Rework"),
    [listings],
  );

  const pendingCount = pendingListings.length;
  const reworkCount = reworkListings.length;

  // Client-side draft fetching (per-user, can't be PPR-cached)
  const [drafts, setDrafts] = useState<DraftListingWithDetails[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);

  useEffect(() => {
    getDraftListings().then((data) => {
      setDrafts(data);
      setDraftsLoaded(true);
    });
  }, []);

  const draftCount = drafts.length;

  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") ?? "listings") as "listings" | "pending" | "rework" | "featured" | "drafts";

  const setTab = useCallback(
    (v: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (v === "listings") {
        params.delete("tab");
      } else {
        params.set("tab", v);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [searchParams, router],
  );

  // --- Filter configs with grouped sections ---

  const mainFilterConfig = useMemo<FilterConfig[]>(() => {
    const filters: FilterConfig[] = [
      // Status group
      {
        columnId: "visibility",
        label: "Visibility",
        type: "multi-select",
        group: "Status",
        options: [
          { label: "Visible", value: "Visible" },
          { label: "Hidden", value: "Hidden" },
        ],
      },
      ...(pageType === "sale"
        ? [
            {
              columnId: "sold_status",
              label: "Sold Status",
              type: "multi-select" as const,
              group: "Status",
              options: [
                { label: "Available", value: "Available" },
                { label: "Sold", value: "Sold" },
              ],
            },
          ]
        : [
            {
              columnId: "rent_status",
              label: "Rent Status",
              type: "multi-select" as const,
              group: "Status",
              options: [
                { label: "Available", value: "Available" },
                { label: "Rented", value: "Rented" },
              ],
            },
          ]),
      {
        columnId: "is_featured",
        label: "Featured",
        type: "boolean" as const,
        group: "Status",
        trueLabel: "Featured",
        falseLabel: "Not Featured",
        trueValue: "Yes",
        falseValue: "No",
      },
      // Product group
      {
        columnId: "product_type",
        label: "Product Type",
        type: "multi-select",
        group: "Product",
        options: [
          { label: "Equipment", value: "equipment" },
          { label: "Attachment", value: "attachment" },
        ],
      },
      ...(pageType === "sale"
        ? [
            {
              columnId: "condition_name",
              label: "Condition",
              type: "multi-select" as const,
              group: "Product",
            },
          ]
        : []),
      // Price group
      {
        columnId: "mmk_price",
        label: "MMK Price",
        type: "number-range",
        group: "Price",
        unit: "MMK",
      },
      // Other group
      { columnId: "partner_name", label: "Partner", type: "multi-select", group: "Other" },
      { columnId: "created_at", label: "Created At", type: "date-range", group: "Other" },
    ];
    return filters;
  }, [pageType]);

  const pendingFilterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "product_type",
        label: "Product Type",
        type: "multi-select",
        options: [
          { label: "Equipment", value: "equipment" },
          { label: "Attachment", value: "attachment" },
        ],
      },
      { columnId: "created_at", label: "Submitted", type: "date-range" },
    ],
    [],
  );

  const reworkFilterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "product_type",
        label: "Product Type",
        type: "multi-select",
        options: [
          { label: "Equipment", value: "equipment" },
          { label: "Attachment", value: "attachment" },
        ],
      },
      { columnId: "created_at", label: "Submitted", type: "date-range" },
    ],
    [],
  );

  const featuredFilterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "listing_type",
        label: "Listing Type",
        type: "multi-select",
        options: [
          { label: "For Sale", value: "For Sale" },
          { label: "For Rent", value: "For Rent" },
        ],
      },
      { columnId: "partner_name", label: "Partner", type: "multi-select" },
    ],
    [],
  );

  const handleAddListing = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEYS.LISTING_AUTOSAVE);
    sessionStorage.setItem(SESSION_KEYS.NEW_LISTING_DEFAULT, pageType);
    window.location.href = "/listings/new";
  }, [pageType]);

  const handleBulkDelete = useCallback(
    async (selected: ListingRow[]) => {
      const ids = selected.map((l) => l.id);
      const deleteFn = pageType === "sale" ? deleteSaleListings : deleteRentListings;
      return deleteFn(ids);
    },
    [pageType],
  );

  const buildDeleteDescription = useCallback(
    async (selected: ListingRow[]) => {
      const count = selected.length;
      const plural = count === 1 ? "listing" : "listings";
      return `${count} ${plural} will be moved to the trash. You can restore them within 30 days.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: ListingRow[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDeleteDescription}
            itemLabel="listing"
          />
        )}
        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus aria-hidden="true" /> Add Listing{" "}
                <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAddListing}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/listings">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    ),
    [handleBulkDelete, buildDeleteDescription, canCreate, canDelete, handleAddListing],
  );

  const tableName = pageType === "sale" ? "sale_listing" : "rent_listing";

  const {
    data: approvedData,
    handleReorder: handleApprovedReorder,
    handleMoveToPosition: handleApprovedMoveToPosition,
  } = useDragReorder(approvedListings, {
    getRowId: (r) => r.id,
    tableName,
    feature,
  });

  const {
    data: featuredData,
    handleReorder,
    handleMoveToPosition,
  } = useDragReorder(featured, {
    getRowId: (r) => r.id,
    tableName: "featured_listing",
    feature: "featured_listings",
  });

  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="listings">
            <Icon className="size-4" aria-hidden="true" />
            {config.tabLabel}
          </TabsTrigger>
          <TabsTrigger value="featured">
            <Pin className="size-4" aria-hidden="true" />
            Featured
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="size-4" aria-hidden="true" />
            Pending
            {pendingCount > 0 && (
              <TabCount>{pendingCount}</TabCount>
            )}
          </TabsTrigger>
          <TabsTrigger value="drafts">
            <FileEdit className="size-4" aria-hidden="true" />
            Drafts
            {draftCount > 0 && (
              <TabCount>{draftCount}</TabCount>
            )}
          </TabsTrigger>
          <TabsTrigger value="rework">
            <XCircle className="size-4" aria-hidden="true" />
            Rework
            {reworkCount > 0 && (
              <TabCount>{reworkCount}</TabCount>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings">
          {approvedListings.length > 0 ? (
            <DataTable
              columns={columns}
              data={approvedData}
              searchKeys={["model_name", "partner_name"]}
              searchPlaceholder="Search by model or partner"
              filterConfig={mainFilterConfig}
              filterStorageKey={`listings-${pageType}-filters`}
              initialColumnVisibility={HIDDEN_FILTER_COLUMNS}
              enableSelection
              enablePagination
              pageSize={10}
              toolbar={renderToolbar}
              enableDragSort
              getRowId={(row) => row.id}
              onReorder={handleApprovedReorder}
              onMoveToPosition={handleApprovedMoveToPosition}
              enableExport
              exportFileName={`${pageType}-listings`}
              onRowClick={(row) => router.push(`/listings/${row.product_list_id}`)}
            />
          ) : (
            <EmptyState
              icon={Icon}
              title={config.emptyTitle}
              description={config.emptyDescription}
              fullPage={false}
              action={
                canCreate ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        <Plus aria-hidden="true" /> Add Listing{" "}
                        <ChevronDown className="ml-1 size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuItem onClick={handleAddListing}>
                        <FileText /> Fill Form
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/bulk-upload/listings">
                          <FileSpreadsheet /> Excel Upload
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        <TabsContent value="featured">
          {featuredData.length > 0 ? (
            <DataTable
              columns={featuredColumns}
              data={featuredData}
              searchKeys={["model_name", "partner_name"]}
              searchPlaceholder="Search by model or partner"
              filterConfig={featuredFilterConfig}
              filterStorageKey="listings-featured-filters"
              enableDragSort
              getRowId={(row) => row.id}
              onReorder={handleReorder}
              onMoveToPosition={handleMoveToPosition}
              enableExport
              exportFileName="featured-listings"
            />
          ) : (
            <EmptyState
              icon={Pin}
              title="No featured listings"
              description="Feature a listing from the Listings tab to show it on the home page."
              fullPage={false}
            />
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pendingListings.length > 0 ? (
            <DataTable
              columns={pendingColumns}
              data={pendingListings}
              searchKeys={["model_name", "partner_name"]}
              searchPlaceholder="Search pending listings"
              filterConfig={pendingFilterConfig}
              filterStorageKey={`listings-${pageType}-pending-filters`}
              enablePagination
              pageSize={10}
              enableExport
              exportFileName="pending-listings"
              onRowClick={(row) => router.push(`/listings/${row.product_list_id}`)}
            />
          ) : (
            <EmptyState
              icon={Clock}
              title="No pending listings"
              description="All listings have been reviewed."
              fullPage={false}
            />
          )}
        </TabsContent>

        <TabsContent value="drafts">
          {!draftsLoaded ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="size-5" />
            </div>
          ) : drafts.length > 0 ? (
            <DataTable
              columns={draftColumns}
              data={drafts}
              searchKeys={["model_name"]}
              searchPlaceholder="Search drafts"
              enablePagination
              pageSize={10}
              getRowId={(row) => row.id}
              enableExport
              exportFileName="draft-listings"
            />
          ) : (
            <EmptyState
              icon={FileEdit}
              title="No drafts"
              description="Save a listing as draft to continue later."
              fullPage={false}
            />
          )}
        </TabsContent>

        <TabsContent value="rework">
          {reworkListings.length > 0 ? (
            <DataTable
              columns={reworkColumns}
              data={reworkListings}
              searchKeys={["model_name", "partner_name"]}
              searchPlaceholder="Search listings needing rework"
              filterConfig={reworkFilterConfig}
              filterStorageKey={`listings-${pageType}-rework-filters`}
              enablePagination
              pageSize={10}
              enableExport
              exportFileName="rework-listings"
              onRowClick={(row) => router.push(`/listings/${row.product_list_id}`)}
            />
          ) : (
            <EmptyState
              icon={XCircle}
              title="No listings need rework"
              description="Listings sent back for rework will appear here."
              fullPage={false}
            />
          )}
        </TabsContent>
      </Tabs>

    </>
  );
}
