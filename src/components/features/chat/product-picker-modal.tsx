"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { assetUrl } from "@/lib/r2-url";
import { getPickableListings } from "@/lib/actions/chat";

export interface SelectedListing {
  id: number;
  type: "sale" | "rent";
  productListId: number;
  customId: string | null;
  name: string | null;
  thumbnail: string | null;
  brandName: string | null;
  price: number | null;
  displayCurrency: string | null;
}

/** A raw listing row from the API */
interface ListingRow extends SelectedListing {}

/** A merged product row for the "All" tab — groups sale + rent under one productListId */
interface MergedProduct {
  productListId: number;
  name: string | null;
  brandName: string | null;
  thumbnail: string | null;
  sale: ListingRow | null;
  rent: ListingRow | null;
}

interface ProductPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (listing: SelectedListing) => void;
}

type TabFilter = "all" | "sale" | "rent";

function formatPrice(
  price: number | null,
  displayCurrency: string | null,
): string {
  if (price == null) return "Price on request";
  if (displayCurrency === "USD") return `$${price.toLocaleString()}`;
  return `${price.toLocaleString()} MMK`;
}

export function ProductPickerModal({
  open,
  onOpenChange,
  onSelect,
}: ProductPickerModalProps) {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");

  // Fetch once on first open
  useEffect(() => {
    if (!open || hasFetched) return;
    setIsLoading(true);
    getPickableListings()
      .then((data) => setListings(data))
      .catch(() => setListings([]))
      .finally(() => {
        setIsLoading(false);
        setHasFetched(true);
      });
  }, [open, hasFetched]);

  // Reset search and tab on close
  useEffect(() => {
    if (!open) {
      setSearch("");
      setTab("all");
    }
  }, [open]);

  // Merge listings by productListId for the "All" tab
  const mergedProducts = useMemo(() => {
    const map = new Map<number, MergedProduct>();
    for (const l of listings) {
      let entry = map.get(l.productListId);
      if (!entry) {
        entry = {
          productListId: l.productListId,
          name: l.name,
          brandName: l.brandName,
          thumbnail: l.thumbnail,
          sale: null,
          rent: null,
        };
        map.set(l.productListId, entry);
      }
      if (l.type === "sale") entry.sale = l;
      else entry.rent = l;
    }
    return Array.from(map.values());
  }, [listings]);

  // Filtered results based on tab + search
  const filteredMerged = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mergedProducts.filter((p) => {
      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.brandName?.toLowerCase().includes(q) ||
        p.sale?.customId?.toLowerCase().includes(q) ||
        p.rent?.customId?.toLowerCase().includes(q)
      );
    });
  }, [mergedProducts, search]);

  const filteredSingle = useMemo(() => {
    if (tab === "all") return [];
    let items = listings.filter((l) => l.type === tab);
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.brandName?.toLowerCase().includes(q) ||
          l.customId?.toLowerCase().includes(q),
      );
    }
    return items;
  }, [listings, tab, search]);

  function handleSelect(listing: SelectedListing) {
    onSelect(listing);
    onOpenChange(false);
  }

  function handleSelectMerged(product: MergedProduct) {
    // Prefer sale listing, fall back to rent
    const listing = product.sale ?? product.rent;
    if (listing) {
      onSelect(listing);
      onOpenChange(false);
    }
  }

  const tabs: { label: string; value: TabFilter }[] = [
    { label: "All", value: "all" },
    { label: "For Sale", value: "sale" },
    { label: "For Rent", value: "rent" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-base">Share a Listing</DialogTitle>
          <DialogDescription className="sr-only">
            Select a listing to share in the chat
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                tab === t.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Listing list */}
        <div className="max-h-[400px] overflow-y-auto border-t px-2 py-1">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* All tab — merged rows */}
          {!isLoading && tab === "all" && (
            <>
              {filteredMerged.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No listings found
                </p>
              )}
              {filteredMerged.map((product) => (
                <button
                  key={product.productListId}
                  type="button"
                  onClick={() => handleSelectMerged(product)}
                  className="w-full flex gap-3 items-center rounded-lg p-2 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="relative size-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {product.thumbnail ? (
                      <Image
                        src={assetUrl(product.thumbnail) ?? ""}
                        alt={product.name ?? "Product"}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="size-full bg-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {product.brandName && (
                      <p className="text-[10px] uppercase text-muted-foreground truncate">
                        {product.brandName}
                      </p>
                    )}
                    <p className="text-xs font-medium truncate">
                      {product.name ?? "Unnamed"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {product.sale && (
                        <>
                          <span className="text-[10px] text-muted-foreground">
                            {formatPrice(product.sale.price, product.sale.displayCurrency)}
                          </span>
                          <Badge
                            variant="equipment"
                            className="text-[10px] h-4 px-1"
                          >
                            Sale
                          </Badge>
                        </>
                      )}
                      {product.rent && (
                        <>
                          {product.sale && (
                            <span className="text-[10px] text-muted-foreground/40">|</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatPrice(product.rent.price, product.rent.displayCurrency)}
                          </span>
                          <Badge
                            variant="attachment"
                            className="text-[10px] h-4 px-1"
                          >
                            Rent
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Sale / Rent tabs — individual rows */}
          {!isLoading && tab !== "all" && (
            <>
              {filteredSingle.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No listings found
                </p>
              )}
              {filteredSingle.map((listing) => (
                <button
                  key={`${listing.type}-${listing.id}`}
                  type="button"
                  onClick={() => handleSelect(listing)}
                  className="w-full flex gap-3 items-center rounded-lg p-2 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="relative size-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {listing.thumbnail ? (
                      <Image
                        src={assetUrl(listing.thumbnail) ?? ""}
                        alt={listing.name ?? "Product"}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="size-full bg-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {listing.brandName && (
                      <p className="text-[10px] uppercase text-muted-foreground truncate">
                        {listing.brandName}
                      </p>
                    )}
                    <p className="text-xs font-medium truncate">
                      {listing.name ?? "Unnamed"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatPrice(listing.price, listing.displayCurrency)}
                      </span>
                      <Badge
                        variant={
                          listing.type === "sale" ? "equipment" : "attachment"
                        }
                        className="text-[10px] h-4 px-1"
                      >
                        {listing.type === "sale" ? "Sale" : "Rent"}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
