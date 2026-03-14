"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { assetUrl } from "@/lib/r2-url";
import { searchListings } from "@/lib/actions/chat";

interface SelectedListing {
  id: number;
  type: "sale" | "rent";
  name: string | null;
  thumbnail: string | null;
  brandName: string | null;
  price: number | null;
  displayCurrency: string | null;
}

interface ProductPickerProps {
  onSelect: (listing: SelectedListing) => void;
  onCancel: () => void;
}

function formatPrice(
  price: number | null,
  displayCurrency: string | null,
): string {
  if (price == null) return "Price on request";
  if (displayCurrency === "USD") return `$${price.toLocaleString()}`;
  return `${price.toLocaleString()} MMK`;
}

export function ProductPicker({ onSelect, onCancel }: ProductPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SelectedListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchListings(query.trim());
        setResults(
          data.map((r) => ({
            id: r.listingId,
            type: r.listingType,
            name: r.productName,
            thumbnail: r.thumbnailUrl,
            brandName: r.brandName,
            price: r.displayCurrency === "USD" ? r.usdPrice : r.mmkPrice,
            displayCurrency: r.displayCurrency,
          })),
        );
        setHasSearched(true);
      } catch {
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="w-72 rounded-xl border bg-popover p-3 shadow-lg">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings..."
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Results */}
      <div className="mt-2 max-h-60 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !hasSearched && query.trim().length < 2 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Type at least 2 characters to search
          </p>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No listings found
          </p>
        )}

        {!isLoading &&
          results.map((listing) => (
            <button
              key={`${listing.type}-${listing.id}`}
              type="button"
              onClick={() => onSelect(listing)}
              className="w-full flex gap-2 items-center rounded-lg p-2 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="size-9 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {listing.thumbnail ? (
                  <img
                    src={assetUrl(listing.thumbnail) ?? undefined}
                    alt={listing.name ?? "Product"}
                    className="object-cover size-full"
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
                    variant={listing.type === "sale" ? "equipment" : "attachment"}
                    className="text-[10px] h-4 px-1"
                  >
                    {listing.type === "sale" ? "Sale" : "Rent"}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
      </div>

      {/* Cancel */}
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center mt-2 py-1"
      >
        Cancel
      </button>
    </div>
  );
}
