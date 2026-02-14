"use client";

import { useState, useEffect, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { LocationForm } from "./location-form";
import { deleteLocation, getListingCount } from "@/lib/actions/location";
import type { Location } from "@/types/location";

interface RowActionsProps {
  location: Location;
}

export function RowActions({ location }: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!showDelete) return;
    let cancelled = false;
    getListingCount([location.location_id]).then((counts) => {
      if (!cancelled) setLinkedCount(counts[location.location_id] ?? 0);
    });
    return () => {
      cancelled = true;
      setLinkedCount(null);
    };
  }, [showDelete, location.location_id]);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLocation(location.location_id);
      if (result.success) {
        toast.success("Location deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deleteDescription =
    linkedCount !== null && linkedCount > 0
      ? `This will permanently delete "${location.city_name}". There ${linkedCount === 1 ? "is" : "are"} ${linkedCount} ${linkedCount === 1 ? "listing" : "listings"} linked to this location that must be removed first.`
      : `This will permanently delete "${location.city_name}". This action cannot be undone.`;

  return (
    <>
      <RowActionsUI
        actions={[
          { label: "Edit", icon: Pencil, onClick: () => setShowEdit(true) },
          { label: "Delete", icon: Trash2, onClick: () => setShowDelete(true), variant: "destructive" },
        ]}
      />

      {showEdit && (
        <LocationForm
          open={showEdit}
          onOpenChange={setShowEdit}
          location={location}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete location?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
