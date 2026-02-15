"use client";

import { useState, useTransition, useEffect, lazy, Suspense } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
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
  ConditionType,
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
  conditionTypes: ConditionType[];
  exchangeRate: number;
}

export function ListingRowActions({
  listing,
  pageType,
  partners,
  equipmentModels,
  attachmentModels,
  locations,
  conditionTypes,
  exchangeRate,
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
      <RowActionsUI
        actions={[
          { label: "Edit", icon: Pencil, onClick: () => setShowEdit(true) },
          { label: "Delete", icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive", separatorBefore: true },
        ]}
      />

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
            conditionTypes={conditionTypes}
            exchangeRate={exchangeRate}
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
