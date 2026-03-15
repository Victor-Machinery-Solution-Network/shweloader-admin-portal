# Product Picker Modal Design

## Problem

The current product picker in the chat input bar is a small floating popover (272px) that requires typing at least 2 characters before showing any results. There is no way to browse listings, no category filtering, and the UX feels disconnected from the rest of the admin portal.

## Solution

Replace the popover with a proper Dialog modal that loads all approved listings on open, with client-side search and tab filtering (All | For Sale | For Rent). The modal presents a compact, clickable list of items — not a full DataTable.

## Data

### New server action: `getPickableListings()`

Location: `src/lib/actions/chat.ts`

Requires `requirePermission("chat", "read")`.

Single UNION ALL query returning both sale and rent listings. Only includes approved, non-hidden, non-deleted, non-sold-out/non-rented listings (matching what app users can browse).

**Important:** Use the correct JOIN direction `sl.product_list_id = pl.id` (the existing `searchListings()` has a bug with `pl.sale_listing_id = sl.id` — do not replicate).

Returns array of:

```ts
interface PickableListing {
  id: number;
  type: "sale" | "rent";
  name: string | null;
  brandName: string | null;
  thumbnail: string | null;
  price: number | null;
  displayCurrency: string | null;
}
```

The `price` field is derived server-side: if `display_currency = 'USD'` use `usd_price`, otherwise use `mmk_price`. This matches the existing `SelectedListing` type downstream.

Query filters:
- `sl.deleted_at IS NULL`, `rl.deleted_at IS NULL`
- `sl.is_hidden = 0`, `rl.is_hidden = 0`
- `sl.is_sold_out = 0`, `rl.is_rented = 0`
- `pl.deleted_at IS NULL`, `pl.is_draft = 0`
- Only approved listings (join `approval_status_type` where `status_name = 'Approved'`)
- `ORDER BY pl.created_at DESC`
- `LIMIT 200`

### Client-side filtering

- **Tabs:** Filter `type` field — "all" shows both, "sale" and "rent" filter by type
- **Search:** Case-insensitive match on `name` and `brandName` fields

## Types

### Consolidate `SelectedListing`

Currently duplicated in `product-picker.tsx` and `chat-input-bar.tsx`. Define once in `product-picker-modal.tsx` and export for use in `chat-input-bar.tsx`.

## UI Component

### New file: `src/components/features/chat/product-picker-modal.tsx`

Uses Radix Dialog (shadcn `Dialog` / `DialogContent`). Include a visually hidden `DialogDescription` for accessibility.

**Layout (top to bottom):**

1. **Dialog header** — title "Share a Listing"
2. **Search input** — with Search icon, placeholder "Search listings...", filters client-side
3. **Tab buttons** — three buttons: All | For Sale | For Rent, styled as segmented control or simple tab buttons using existing UI patterns
4. **Scrollable list** — max height ~400px, `overflow-y-auto`
5. **Loading state** — centered spinner on initial fetch
6. **Empty state** — "No listings found" when search/filter yields no results

**Each list item:**
- Clickable row with hover highlight
- 40px thumbnail (rounded, object-cover) or muted placeholder
- Brand name (tiny uppercase text, muted)
- Model name (small, medium weight, truncated)
- Price text + Sale/Rent badge
- Click selects the listing and closes the modal

### Props

```ts
interface ProductPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (listing: SelectedListing) => void;
}
```

### Behavior

- Data fetched once on first open (not on mount)
- Cached in component state — reopening does not refetch
- Search query and tab selection reset when modal closes
- Selecting a listing calls `onSelect` and closes the modal

## Integration

### Modified: `src/components/features/chat/chat-input-bar.tsx`

- Remove `showProductPicker` state and the floating popover
- Remove `ProductPicker` import, add `ProductPickerModal` import
- Import `SelectedListing` from `product-picker-modal.tsx` (remove local definition)
- Replace with `<ProductPickerModal open={...} onOpenChange={...} onSelect={...} />`
- Package button sets modal open state to `true`
- `onSelect` callback sets `selectedProduct` (same as current behavior)

### Deleted: `src/components/features/chat/product-picker.tsx`

The old popover component is replaced entirely.

### Cleanup: `src/lib/actions/chat.ts`

Delete the old `searchListings()` function — its only consumer (`product-picker.tsx`) is being removed.

## Files Changed

| File | Action |
|------|--------|
| `src/components/features/chat/product-picker-modal.tsx` | Create |
| `src/components/features/chat/chat-input-bar.tsx` | Modify (swap popover for modal, import shared type) |
| `src/lib/actions/chat.ts` | Add `getPickableListings()`, delete `searchListings()` |
| `src/components/features/chat/product-picker.tsx` | Delete |
