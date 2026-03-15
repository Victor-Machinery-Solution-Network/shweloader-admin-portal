# Product Picker Modal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chat product picker popover with a Dialog modal that shows all approved listings with tabs (All | For Sale | For Rent) and search.

**Architecture:** New server action fetches all pickable listings in one query. New modal component renders them as a compact clickable list with client-side tab/search filtering. Old popover component and its server action are deleted.

**Tech Stack:** Next.js server actions, shadcn Dialog, Radix UI, D1 SQL

**Spec:** `docs/superpowers/specs/2026-03-15-product-picker-modal-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/actions/chat.ts` | Modify | Add `getPickableListings()`, delete `searchListings()` and `SearchListingResult` |
| `src/components/features/chat/product-picker-modal.tsx` | Create | Modal with tabs, search, listing list, exports `SelectedListing` type |
| `src/components/features/chat/chat-input-bar.tsx` | Modify | Swap popover for modal, import shared `SelectedListing` type |
| `src/components/features/chat/product-picker.tsx` | Delete | Old popover component |

---

## Task 1: Add `getPickableListings()` server action

**Files:**
- Modify: `src/lib/actions/chat.ts`

- [ ] **Step 1: Add `getPickableListings()` to `chat.ts`**

Add this function after the existing `searchListings` function (around line 501). It replaces the search-based approach with a full listing fetch.

```ts
/** Fetch all approved, visible listings for the product picker modal */
export async function getPickableListings(): Promise<
  {
    id: number;
    type: "sale" | "rent";
    name: string | null;
    brandName: string | null;
    thumbnail: string | null;
    price: number | null;
    displayCurrency: string | null;
  }[]
> {
  await requirePermission("chat", "read");

  const result = await d1.query<{
    listing_id: number;
    listing_type: "sale" | "rent";
    product_name: string | null;
    brand_name: string | null;
    thumbnail_url: string | null;
    mmk_price: number | null;
    usd_price: number | null;
    display_currency: string | null;
  }>(
    `SELECT
      sl.id AS listing_id, 'sale' AS listing_type,
      COALESCE(em.name, am.name) AS product_name,
      pb.name AS brand_name,
      pl.thumbnail_url,
      sl.mmk_price, sl.usd_price, sl.display_currency
    FROM sale_listing sl
    JOIN product_list pl ON sl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    JOIN approval_status_type ast ON sl.approve_status_id = ast.id
    WHERE sl.deleted_at IS NULL
      AND sl.is_hidden = 0
      AND sl.is_sold_out = 0
      AND pl.deleted_at IS NULL
      AND pl.is_draft = 0
      AND ast.status_name = 'Approved'
    UNION ALL
    SELECT
      rl.id AS listing_id, 'rent' AS listing_type,
      COALESCE(em.name, am.name) AS product_name,
      pb.name AS brand_name,
      pl.thumbnail_url,
      rl.mmk_price, rl.usd_price, rl.display_currency
    FROM rent_listing rl
    JOIN product_list pl ON rl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    JOIN approval_status_type ast ON rl.approve_status_id = ast.id
    WHERE rl.deleted_at IS NULL
      AND rl.is_hidden = 0
      AND rl.is_rented = 0
      AND pl.deleted_at IS NULL
      AND pl.is_draft = 0
      AND ast.status_name = 'Approved'
    ORDER BY listing_id DESC
    LIMIT 200`,
  );

  return result.results.map((row) => ({
    id: row.listing_id,
    type: row.listing_type,
    name: row.product_name,
    brandName: row.brand_name,
    thumbnail: row.thumbnail_url,
    price:
      row.display_currency === "USD" ? row.usd_price : row.mmk_price,
    displayCurrency: row.display_currency,
  }));
}
```

- [ ] **Step 2: Delete `searchListings()` and `SearchListingResult`**

Remove the `SearchListingResult` interface (lines 15-24) and the `searchListings()` function (lines 442-501). These are no longer used — the only consumer (`product-picker.tsx`) is being deleted.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds (there will be an import error in `product-picker.tsx` which is fine — it's being deleted in Task 3).

---

## Task 2: Create `ProductPickerModal` component

**Files:**
- Create: `src/components/features/chat/product-picker-modal.tsx`

- [ ] **Step 1: Create the modal component**

```tsx
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
                <div className="size-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
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
```

---

## Task 3: Integrate modal into chat input bar and delete old picker

**Files:**
- Modify: `src/components/features/chat/chat-input-bar.tsx`
- Delete: `src/components/features/chat/product-picker.tsx`

- [ ] **Step 1: Update `chat-input-bar.tsx`**

Changes needed:

1. Replace import: `ProductPicker` → `ProductPickerModal` and `SelectedListing`

Replace:
```ts
import { ProductPicker } from "./product-picker";

interface SelectedListing {
  id: number;
  type: "sale" | "rent";
  name: string | null;
  thumbnail: string | null;
  brandName: string | null;
  price: number | null;
  displayCurrency: string | null;
}
```

With:
```ts
import { ProductPickerModal, type SelectedListing } from "./product-picker-modal";
```

2. Replace `showProductPicker` state with `productPickerOpen`:

Replace:
```ts
const [showProductPicker, setShowProductPicker] = useState(false);
```

With:
```ts
const [productPickerOpen, setProductPickerOpen] = useState(false);
```

3. Replace the product share button and floating popover (lines 236-263):

Replace:
```tsx
{/* Product share button */}
<div className="relative shrink-0 mb-0.5">
  <Button
    type="button"
    variant="ghost"
    size="icon"
    onClick={() => setShowProductPicker(!showProductPicker)}
    disabled={disabled || hasFiles}
    title={
      hasFiles
        ? "Remove files to share a product"
        : "Share a product"
    }
  >
    <Package className="size-4" />
    <span className="sr-only">Share product</span>
  </Button>
  {showProductPicker && (
    <div className="absolute bottom-full left-0 mb-2 z-50">
      <ProductPicker
        onSelect={(listing) => {
          setSelectedProduct(listing);
          setShowProductPicker(false);
        }}
        onCancel={() => setShowProductPicker(false)}
      />
    </div>
  )}
</div>
```

With:
```tsx
{/* Product share button */}
<Button
  type="button"
  variant="ghost"
  size="icon"
  className="shrink-0 mb-0.5"
  onClick={() => setProductPickerOpen(true)}
  disabled={disabled || hasFiles}
  title={
    hasFiles
      ? "Remove files to share a product"
      : "Share a product"
  }
>
  <Package className="size-4" />
  <span className="sr-only">Share product</span>
</Button>
<ProductPickerModal
  open={productPickerOpen}
  onOpenChange={setProductPickerOpen}
  onSelect={setSelectedProduct}
/>
```

- [ ] **Step 2: Delete `product-picker.tsx`**

Delete file: `src/components/features/chat/product-picker.tsx`

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Manual test**

1. Open the chat page
2. Select a chat session
3. Click the Package icon — modal should open
4. Verify all listings load with thumbnails, names, brands, prices, badges
5. Switch between All / For Sale / For Rent tabs — instant filtering
6. Type in search box — filters by name and brand
7. Click a listing — modal closes, product preview appears in input bar
8. Send message with product attached

- [ ] **Step 5: Commit**

```bash
git add src/components/features/chat/product-picker-modal.tsx src/components/features/chat/chat-input-bar.tsx src/lib/actions/chat.ts
git rm src/components/features/chat/product-picker.tsx
git commit -m "feat: replace product picker popover with modal dialog

Add tabbed modal (All/For Sale/For Rent) with search and full listing
browse. Loads all approved listings on open, filters client-side.
Delete old search-only popover and broken searchListings() action."
```
