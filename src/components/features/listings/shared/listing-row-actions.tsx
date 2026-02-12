"use client";

import { useState, useTransition, useEffect, lazy, Suspense } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/shared/delete-dialog";

const LazyListingForm = lazy(() =>
  import("./listing-form").then((mod) => ({ default: mod.ListingForm }))
);
import {
  deleteSaleListing,
  deleteRentListing,
  getProductImages,
} from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  ProductImage,
  ApprovedPartner,
} from "@/types/listing";
import type { EquipmentModel } from "@/types/equipment";
import type { AttachmentModel } from "@/types/attachment";
import type { Location } from "@/types/location";

interface ListingRowActionsProps {
  listing: SaleListingWithDetails | RentListingWithDetails;
  pageType: "sale" | "rent";
  partners: ApprovedPartner[];
  equipmentModels: EquipmentModel[];
  attachmentModels: AttachmentModel[];
  locations: Location[];
}

export function ListingRowActions({
  listing,
  pageType,
  partners,
  equipmentModels,
  attachmentModels,
  locations,
}: ListingRowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!showEdit) return;
    if (listing.product_list_id) {
      let cancelled = false;
      getProductImages(listing.product_list_id).then((images) => {
        if (!cancelled) setExistingImages(images);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [showEdit, listing.product_list_id]);

  function handleDelete() {
    startTransition(async () => {
      const deleteFn =
        pageType === "sale" ? deleteSaleListing : deleteRentListing;
      const result = await deleteFn(listing.id);
      if (result.success) {
        toast.success("Listing deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreHorizontal />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setShowEdit(true)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setShowDelete(true)}
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showEdit && (
        <Suspense fallback={null}>
          <LazyListingForm
            open={showEdit}
            onOpenChange={setShowEdit}
            pageType={pageType}
            listing={listing}
            existingImages={existingImages}
            partners={partners}
            equipmentModels={equipmentModels}
            attachmentModels={attachmentModels}
            locations={locations}
          />
        </Suspense>
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title={`Delete ${pageType} listing?`}
        description={`This will permanently delete the listing for "${listing.model_name ?? "Unknown"}". This action cannot be undone.`}
        isPending={isPending}
      />
    </>
  );
}
