"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import {
  deleteSaleListing,
  deleteRentListing,
} from "@/lib/actions/listing";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
} from "@/types/listing";

interface ListingRowActionsProps {
  listing: SaleListingWithDetails | RentListingWithDetails;
  pageType: "sale" | "rent";
}

export function ListingRowActions({
  listing,
  pageType,
}: ListingRowActionsProps) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

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
          {
            label: "Edit",
            icon: Pencil,
            onClick: () =>
              router.push(`/listings/for-${pageType}/${listing.id}/edit`),
          },
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => setShowDelete(true),
            variant: "destructive",
            separatorBefore: true,
          },
        ]}
      />

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
