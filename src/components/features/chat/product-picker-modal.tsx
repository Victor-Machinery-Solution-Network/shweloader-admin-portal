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
  name: string | null;
  thumbnail: string | null;
  brandName: string | null;
  price: number | null;
  displayCurrency: string | null;
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
  const [listings, setListings] = useState<SelectedListing[]>([]);
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

  // Client-side filtering
  const filtered = useMemo(() => {
    let items = listings;
    if (tab !== "all") {
      items = items.filter((l) => l.type === tab);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.brandName?.toLowerCase().includes(q),
      );
    }
    return items;
  }, [listings, tab, search]);

  function handleSelect(listing: SelectedListing) {
    onSelect(listing);
    onOpenChange(false);
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

          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              No listings found
            </p>
          )}

          {!isLoading &&
            filtered.map((listing) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
