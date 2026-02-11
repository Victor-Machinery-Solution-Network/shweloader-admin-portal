"use client";

import { useState, useCallback } from "react";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { LocationForm } from "./location-form";
import { columns } from "./columns";
import { deleteLocations, getListingCount } from "@/lib/actions/location";
import type { Location } from "@/types/location";

interface LocationsClientProps {
  locations: Location[];
}

export function LocationsClient({ locations }: LocationsClientProps) {
  const [showCreate, setShowCreate] = useState(false);

  const buildDescription = useCallback(
    async (selected: Location[]) => {
      const ids = selected.map((l) => l.location_id);
      const counts = await getListingCount(ids);
      const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

      const names = selected.map((l) => `"${l.city_name}"`).join(", ");
      let msg = `This will permanently delete ${selected.length === 1 ? names : `${selected.length} locations (${names})`}.`;

      if (totalLinked > 0) {
        msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "listing" : "listings"} linked to ${selected.length === 1 ? "this location" : "these locations"} that must be removed first.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: Location[]) => {
      const ids = selected.map((l) => l.location_id);
      return deleteLocations(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: Location[]) => (
      <BulkDeleteButton
        selectedRows={selected}
        onDelete={handleBulkDelete}
        buildDescription={buildDescription}
        itemLabel="location"
      />
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      <PageHeader title="Locations" description="Manage locations">
        <Button onClick={() => setShowCreate(true)}>
          <Plus /> Add Location
        </Button>
      </PageHeader>

      {locations.length > 0 ? (
        <DataTable
          columns={columns}
          data={locations}
          searchKey="city_name"
          searchPlaceholder="Search locations..."
          enableSelection
          enablePagination
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={MapPin}
          title="No locations yet"
          description="Get started by creating your first location."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Location
            </Button>
          }
        />
      )}

      <LocationForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
