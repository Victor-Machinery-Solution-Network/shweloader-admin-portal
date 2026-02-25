"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
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
  const feature = pageType === "sale" ? "sale_listings" : "rent_listings";
  const canEdit = useHasPermission(feature, "edit");
  const canDelete = useHasPermission(feature, "delete");
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

  const actions = [
    ...(canEdit
      ? [
          {
            label: "Edit" as const,
            icon: Pencil,
            onClick: () =>
              router.push(`/listings/for-${pageType}/${listing.id}/edit`),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            label: "Delete" as const,
            icon: Trash2,
            onClick: () => setShowDelete(true),
            variant: "destructive" as const,
            separatorBefore: true,
          },
        ]
      : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />

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
