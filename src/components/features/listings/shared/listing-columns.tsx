"use client";


import { useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { assetUrl } from "@/lib/r2-url";
import { ListingThumbnail } from "./listing-thumbnail";
import { formatDate } from "@/lib/utils";
import {
  Eye,
  EyeOff,
  DollarSign,
  PackageX,
  PackageCheck,
  CalendarCheck,
  CalendarX,
  Pin,
  PinOff,
  User,
  Building2,
  Handshake,
  Calendar,
} from "lucide-react";

/** DollarSign with diagonal slash — short ticks keep the center clean */
function DollarSignOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <line x1="12" x2="12" y1="2" y2="4" />
      <line x1="12" x2="12" y1="20" y2="22" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHasPermission } from "@/hooks/use-permissions";
import { ListingRowActions } from "./listing-row-actions";
import {
  toggleSaleHidden,
  toggleRentHidden,
  toggleSoldOut,
  toggleIsRented,
  toggleSaleHidePrice,
  toggleRentHidePrice,
  addToFeatured,
  removeFromFeatured,
} from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
} from "@/types/listing";

// --- Common listing shape (fields shared by sale & rent) ---

type ListingBase = {
  thumbnail_url: string | null;
  model_name: string | null;
  partner_name: string | null;
  product_type: string;
  mmk_price: number | null;
  usd_price: number | null;
  use_system_rate: number;
};

function hasPositivePrice(value: number | null | undefined) {
  const price = Number(value ?? 0);
  return Number.isFinite(price) && price > 0;
}

// --- Inline Pill Toggle Components ---

function HiddenToggle({
  isHidden,
  onToggle,
}: {
  isHidden: boolean;
  onToggle: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const label = isHidden ? "Show listing" : "Hide listing";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isHidden ? "destructive" : "outline"}
          size="icon-sm"
          disabled={isPending}
          aria-label={label}
          className={
            isHidden
              ? "rounded-full"
              : "text-muted-foreground rounded-full border-dashed"
          }
          onClick={() => startTransition(() => onToggle())}
        >
          {isHidden ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function HidePriceToggle({
  hidePrice,
  onToggle,
}: {
  hidePrice: boolean;
  onToggle: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const label = hidePrice ? "Show price" : "Hide price";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={hidePrice ? "destructive" : "outline"}
          size="icon-sm"
          disabled={isPending}
          aria-label={label}
          className={
            hidePrice
              ? "rounded-full"
              : "text-muted-foreground rounded-full border-dashed"
          }
          onClick={() => startTransition(() => onToggle())}
        >
          {hidePrice ? <DollarSignOff aria-hidden="true" className="size-5" /> : <DollarSign aria-hidden="true" className="size-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function SoldOutToggle({
  isSoldOut,
  listingId,
}: {
  isSoldOut: boolean;
  listingId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const label = isSoldOut ? "Mark available" : "Mark sold out";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isSoldOut ? "destructive" : "outline"}
          size="icon-sm"
          disabled={isPending}
          aria-label={label}
          className={
            isSoldOut
              ? "rounded-full"
              : "text-muted-foreground rounded-full border-dashed"
          }
          onClick={() =>
            startTransition(async () => {
              const result = await toggleSoldOut(listingId);
              if (result.success) {
                toast.success(
                  result.is_sold_out ? "Marked as sold out" : "Marked as available",
                );
              } else {
                toast.error(result.error ?? "Failed to toggle");
              }
            })
          }
        >
          {isSoldOut ? (
            <PackageX aria-hidden="true" className="size-5" />
          ) : (
            <PackageCheck aria-hidden="true" className="size-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function IsRentedToggle({
  isRented,
  listingId,
}: {
  isRented: boolean;
  listingId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const label = isRented ? "Mark available" : "Mark as rented";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isRented ? "destructive" : "outline"}
          size="icon-sm"
          disabled={isPending}
          aria-label={label}
          className={
            isRented
              ? "rounded-full"
              : "text-muted-foreground rounded-full border-dashed"
          }
          onClick={() =>
            startTransition(async () => {
              const result = await toggleIsRented(listingId);
              if (result.success) {
                toast.success(
                  result.is_rented ? "Marked as rented" : "Marked as available",
                );
              } else {
                toast.error(result.error ?? "Failed to toggle");
              }
            })
          }
        >
          {isRented ? (
            <CalendarCheck aria-hidden="true" className="size-5" />
          ) : (
            <CalendarX aria-hidden="true" className="size-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function FeatureToggle({
  featuredId,
  listingType,
  listingId,
}: {
  featuredId: number | null;
  listingType: "sale" | "rent";
  listingId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const isFeatured = featuredId != null;
  const label = isFeatured ? "Remove from featured" : "Feature on home page";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={isPending}
          aria-label={label}
          className={
            isFeatured
              ? "rounded-full border-transparent bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
              : "text-muted-foreground rounded-full border-dashed"
          }
          onClick={() =>
            startTransition(async () => {
              if (isFeatured) {
                const result = await removeFromFeatured(featuredId);
                if (result.success) {
                  toast.success("Removed from featured");
                } else {
                  toast.error(result.error ?? "Failed to remove");
                }
              } else {
                const result = await addToFeatured(listingType, listingId);
                if (result.success) {
                  toast.success("Featured on home page");
                } else {
                  toast.error(result.error ?? "Failed to feature");
                }
              }
            })
          }
        >
          {isFeatured ? (
            <Pin aria-hidden="true" className="size-5 fill-current" />
          ) : (
            <PinOff aria-hidden="true" className="size-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

// --- Shared column factories ---

/** Combined thumbnail + model name + custom ID — the "hero" cell of every listing table. */
function productInfoColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    accessorKey: "model_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product" />
    ),
    cell: ({ row }) => {
      const src = assetUrl(row.original.thumbnail_url);
      const customId = (row.original as Record<string, unknown>).custom_id as string | null;
      return (
        <div className="flex items-center gap-3">
          <ListingThumbnail src={src} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.original.model_name ?? "\u2014"}</p>
            {customId && (
              <p className="truncate text-xs text-muted-foreground font-mono">{customId}</p>
            )}
          </div>
        </div>
      );
    },
    minSize: 200,
  };
}

// --- Partner Info Dialog (read-only, uses prefetched data) ---

interface PartnerInfo {
  partner_name: string | null;
  partner_email: string | null;
  partner_phone: string | null;
  partner_company: string | null;
  partner_address: string | null;
  partner_verified: number | null;
  partner_joined: string | null;
  partner_business_type: string | null;
  partner_type_name: string | null;
  partner_status: string | null;
  partner_applied_at: string | null;
  partner_reviewed_at: string | null;
  partner_app_user_id: number | null;
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <span className={`text-sm text-right ${value ? "" : "text-muted-foreground"}`}>
        {value ?? "\u2014"}
      </span>
    </div>
  );
}

function PartnerInfoDialog({
  data,
  open,
  onOpenChange,
}: {
  data: PartnerInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isVerified = data.partner_verified === 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Partner Details</DialogTitle>
          <DialogDescription>
            {data.partner_status && (
              <Badge
                variant={
                  data.partner_status.toLowerCase() === "approved"
                    ? "success"
                    : data.partner_status.toLowerCase() === "rejected"
                      ? "destructive"
                      : "secondary"
                }
                className="text-xs"
              >
                {data.partner_status}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 p-1 -m-1">
          {/* User Profile */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="size-4 text-muted-foreground" />
              User Profile
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Name" value={data.partner_name} />
              <DetailRow label="Email" value={data.partner_email} />
              <DetailRow label="Phone" value={data.partner_phone} />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm shrink-0">Verified</span>
                <Badge variant={isVerified ? "success" : "destructive"} className="text-xs">
                  {isVerified ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </section>

          <Separator />

          {/* Business Info */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="size-4 text-muted-foreground" />
              Business
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Company" value={data.partner_company} />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm shrink-0">Type</span>
                {data.partner_business_type ? (
                  <Badge variant="outline" className="text-xs">{data.partner_business_type}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">{"\u2014"}</span>
                )}
              </div>
              <DetailRow label="Address" value={data.partner_address} />
            </div>
          </section>

          <Separator />

          {/* Partner Info */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Handshake className="size-4 text-muted-foreground" />
              Partner Info
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm shrink-0">Partner Type</span>
                {data.partner_type_name ? (
                  <Badge variant="outline" className="text-xs">{data.partner_type_name}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">{"\u2014"}</span>
                )}
              </div>
              {data.partner_applied_at && (
                <DetailRow label="Applied" value={formatDate(data.partner_applied_at)} />
              )}
              {data.partner_reviewed_at && (
                <DetailRow
                  label={data.partner_status?.toLowerCase() === "approved" ? "Approved" : "Reviewed"}
                  value={formatDate(data.partner_reviewed_at)}
                />
              )}
            </div>
          </section>

          <Separator />

          {/* Account */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="size-4 text-muted-foreground" />
              Account
            </div>
            <div className="space-y-2.5">
              <DetailRow label="User ID" value={data.partner_app_user_id ? `#${data.partner_app_user_id}` : null} />
              <DetailRow label="Joined" value={data.partner_joined ? formatDate(data.partner_joined) : null} />
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PartnerCell({ data }: { data: PartnerInfo }) {
  const [open, setOpen] = useState(false);

  if (!data.partner_name) return <span className="text-muted-foreground text-sm">{"\u2014"}</span>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-left hover:underline underline-offset-2 cursor-pointer"
      >
        {data.partner_name}
      </button>
      {open && (
        <PartnerInfoDialog data={data} open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}

function partnerColumn<T extends ListingBase & PartnerInfo>(): ColumnDef<T> {
  return {
    accessorKey: "partner_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Partner" />
    ),
    cell: ({ row }) => <PartnerCell data={row.original} />,
  };
}

function productTypeColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    id: "product_type",
    accessorFn: (row) => row.product_type,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.product_type;
      return (
        <Badge
          variant={type === "equipment" ? "equipment" : "attachment"}
          className="text-xs capitalize"
        >
          {type}
        </Badge>
      );
    },
  };
}

/** Stacked dual-currency price: MMK bold on top, USD muted below. */
function priceColumn<T extends ListingBase>(): ColumnDef<T> {
  return {
    id: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => {
      const { mmk_price, usd_price, use_system_rate } = row.original;
      const hasMmk = hasPositivePrice(mmk_price);
      const hasUsd = hasPositivePrice(usd_price);
      const rateLabel =
        use_system_rate === 0 ? "Custom Rate" : "System Rate";

      if (!hasMmk && !hasUsd) {
        return (
          <span className="text-foreground text-xs font-medium">
            Check with Supplier
          </span>
        );
      }

      return (
        <div className="tabular-nums">
          {hasMmk && (
            <p className="text-sm font-medium">
              {Number(mmk_price).toLocaleString()}{" "}
              <span className="text-muted-foreground font-normal">MMK</span>
            </p>
          )}
          {hasUsd && (
            <p className="text-xs text-muted-foreground">
              ${Number(usd_price).toLocaleString()} ({rateLabel})
            </p>
          )}
        </div>
      );
    },
  };
}

function listedDateColumn<T extends { approved_at: string | null }>(): ColumnDef<T> {
  return {
    accessorKey: "approved_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Listed" />
    ),
    cell: ({ row }) => {
      const date = row.original.approved_at;
      return (
        <span className="text-muted-foreground text-sm tabular-nums">
          {date ? formatDate(date) : "\u2014"}
        </span>
      );
    },
  };
}

// --- Sale Actions Cell ---

function SaleActionsCell({ row }: { row: { original: SaleListingWithDetails } }) {
  const canEdit = useHasPermission("sale_listings", "edit");
  const { id, is_hidden, is_sold_out, hide_price, featured_id } = row.original;
  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-1">
        {canEdit && (
          <>
            <HiddenToggle
              isHidden={is_hidden === 1}
              onToggle={async () => {
                const result = await toggleSaleHidden(id);
                if (result.success) {
                  toast.success(
                    result.is_hidden ? "Listing hidden" : "Listing visible",
                  );
                } else {
                  toast.error(result.error ?? "Failed to toggle");
                }
              }}
            />
            <HidePriceToggle
              hidePrice={hide_price === 1}
              onToggle={async () => {
                const result = await toggleSaleHidePrice(id);
                if (result.success) {
                  toast.success(
                    result.hide_price ? "Price hidden" : "Price visible",
                  );
                } else {
                  toast.error(result.error ?? "Failed to toggle");
                }
              }}
            />
            <SoldOutToggle isSoldOut={is_sold_out === 1} listingId={id} />
            <FeatureToggle
              featuredId={featured_id}
              listingType="sale"
              listingId={id}
            />
          </>
        )}
        <ListingRowActions
          listing={row.original}
          pageType="sale"
        />
      </div>
    </TooltipProvider>
  );
}

// --- Rent Actions Cell ---

function RentActionsCell({ row }: { row: { original: RentListingWithDetails } }) {
  const canEdit = useHasPermission("rent_listings", "edit");
  const { id, is_hidden, is_rented, hide_price, featured_id } = row.original;
  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-1">
        {canEdit && (
          <>
            <HiddenToggle
              isHidden={is_hidden === 1}
              onToggle={async () => {
                const result = await toggleRentHidden(id);
                if (result.success) {
                  toast.success(
                    result.is_hidden ? "Listing hidden" : "Listing visible",
                  );
                } else {
                  toast.error(result.error ?? "Failed to toggle");
                }
              }}
            />
            <HidePriceToggle
              hidePrice={hide_price === 1}
              onToggle={async () => {
                const result = await toggleRentHidePrice(id);
                if (result.success) {
                  toast.success(
                    result.hide_price ? "Price hidden" : "Price visible",
                  );
                } else {
                  toast.error(result.error ?? "Failed to toggle");
                }
              }}
            />
            <IsRentedToggle isRented={is_rented === 1} listingId={id} />
            <FeatureToggle
              featuredId={featured_id}
              listingType="rent"
              listingId={id}
            />
          </>
        )}
        <ListingRowActions
          listing={row.original}
          pageType="rent"
        />
      </div>
    </TooltipProvider>
  );
}

// --- Sale Columns ---

// Filter-only columns (hidden via initialColumnVisibility on the DataTable)
function saleFilterColumns(): ColumnDef<SaleListingWithDetails>[] {
  return [
    { id: "visibility", accessorFn: (row) => row.is_hidden === 1 ? "Hidden" : "Visible", enableSorting: false },
    { id: "sold_status", accessorFn: (row) => row.is_sold_out === 1 ? "Sold" : "Available", enableSorting: false },
    { id: "is_featured", accessorFn: (row) => row.featured_id != null ? "Yes" : "No", enableSorting: false },
    { id: "mmk_price", accessorFn: (row) => row.mmk_price, enableSorting: false },
    { id: "created_at", accessorFn: (row) => row.created_at, enableSorting: false },
  ];
}

function rentFilterColumns(): ColumnDef<RentListingWithDetails>[] {
  return [
    { id: "visibility", accessorFn: (row) => row.is_hidden === 1 ? "Hidden" : "Visible", enableSorting: false },
    { id: "rent_status", accessorFn: (row) => row.is_rented === 1 ? "Rented" : "Available", enableSorting: false },
    { id: "is_featured", accessorFn: (row) => row.featured_id != null ? "Yes" : "No", enableSorting: false },
    { id: "mmk_price", accessorFn: (row) => row.mmk_price, enableSorting: false },
    { id: "created_at", accessorFn: (row) => row.created_at, enableSorting: false },
  ];
}

export function createSaleColumns(): ColumnDef<SaleListingWithDetails>[] {
  return [
    {
      id: "index",
      header: "No.",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {row.index + 1}
        </span>
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },
    productInfoColumn<SaleListingWithDetails>(),
    partnerColumn<SaleListingWithDetails>(),
    productTypeColumn<SaleListingWithDetails>(),
    {
      accessorKey: "condition_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Condition" />
      ),
      cell: ({ row }) => {
        const condition = row.original.condition_name;
        return condition ? (
          <Badge variant="outline" className="text-xs font-normal">
            {condition}
          </Badge>
        ) : (
          <span className="text-muted-foreground">{"\u2014"}</span>
        );
      },
    },
    priceColumn<SaleListingWithDetails>(),
    listedDateColumn<SaleListingWithDetails>(),
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <SaleActionsCell row={row} />,
    },
    ...saleFilterColumns(),
  ];
}

// --- Rent Columns ---

export function createRentColumns(): ColumnDef<RentListingWithDetails>[] {
  return [
    {
      id: "index",
      header: "No.",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {row.index + 1}
        </span>
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },
    productInfoColumn<RentListingWithDetails>(),
    partnerColumn<RentListingWithDetails>(),
    productTypeColumn<RentListingWithDetails>(),
    priceColumn<RentListingWithDetails>(),
    listedDateColumn<RentListingWithDetails>(),
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <RentActionsCell row={row} />,
    },
    ...rentFilterColumns(),
  ];
}
