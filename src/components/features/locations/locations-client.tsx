"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  MapPin,
  Map,
  Landmark,
  Building2,
  Layers,
  Plus,
  ChevronDown,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { LocationTree } from "./location-tree";
import { StateRegionForm } from "./state-region-form";
import { DistrictForm } from "./district-form";
import { TownshipForm } from "./location-form";
import { getStateRegionColumns } from "./state-region-columns";
import { getDistrictColumns } from "./district-columns";
import { getColumns as getTownshipColumns } from "./columns";
import {
  deleteStateRegions,
  deleteDistricts,
  deleteTownships,
  getListingCount,
  getDistrictCount,
  getTownshipCount,
} from "@/lib/actions/location";
import type {
  StateRegion,
  District,
  DistrictWithParent,
  TownshipWithParents,
} from "@/types/location";

interface LocationsClientProps {
  townships: TownshipWithParents[];
  stateRegions: StateRegion[];
  districts: District[];
  districtsWithParents: DistrictWithParent[];
  listingCounts: Record<number, number>;
  districtCounts: Record<number, number>;
  townshipCounts: Record<number, number>;
}

export function LocationsClient({
  townships,
  stateRegions,
  districts,
  districtsWithParents,
  listingCounts,
  districtCounts,
  townshipCounts,
}: LocationsClientProps) {
  const canCreate = useHasPermission("locations", "create");
  const canDelete = useHasPermission("locations", "delete");
  const [showCreateSR, setShowCreateSR] = useState(false);
  const [showCreateDistrict, setShowCreateDistrict] = useState(false);
  const [showCreateTownship, setShowCreateTownship] = useState(false);

  // ─── State/Region tab ────────────────────────────────────────────────
  const srColumns = useMemo(() => getStateRegionColumns(districtCounts), [districtCounts]);

  const srFilterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "type",
        label: "Type",
        type: "multi-select",
        options: [
          { label: "State", value: "state" },
          { label: "Region", value: "region" },
          { label: "Union Territory", value: "union_territory" },
        ],
      },
      { columnId: "created_at", label: "Created At", type: "date-range" },
    ],
    [],
  );

  const buildSRDescription = useCallback(
    async (selected: StateRegion[]) => {
      const counts = await getDistrictCount();
      const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

      const names = selected.map((sr) => `"${sr.name}"`).join(", ");
      let msg = `${selected.length === 1 ? names : `${selected.length} state/regions (${names})`} will be moved to the trash.`;

      if (totalLinked > 0) {
        msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "district" : "districts"} under ${selected.length === 1 ? "this state/region" : "these state/regions"} that will also be deleted.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDeleteSR = useCallback(
    async (selected: StateRegion[]) => {
      const ids = selected.map((sr) => sr.state_region_id);
      return deleteStateRegions(ids);
    },
    [],
  );

  const renderSRToolbar = useCallback(
    (selected: StateRegion[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDeleteSR}
            buildDescription={buildSRDescription}
            itemLabel="state/region"
          />
        )}
        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Add State/Region <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreateSR(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/state-regions">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    ),
    [handleBulkDeleteSR, buildSRDescription, canCreate, canDelete],
  );

  // ─── District tab ────────────────────────────────────────────────────
  const districtColumns = useMemo(
    () => getDistrictColumns(townshipCounts, stateRegions),
    [townshipCounts, stateRegions],
  );

  const districtFilterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "state_region_name",
        label: "State/Region",
        type: "multi-select",
        options: stateRegions.map((sr) => ({ label: sr.name, value: sr.name })),
      },
      { columnId: "created_at", label: "Created At", type: "date-range" },
    ],
    [stateRegions],
  );

  const buildDistrictDescription = useCallback(
    async (selected: DistrictWithParent[]) => {
      const counts = await getTownshipCount();
      const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

      const names = selected.map((d) => `"${d.name}"`).join(", ");
      let msg = `${selected.length === 1 ? names : `${selected.length} districts (${names})`} will be moved to the trash.`;

      if (totalLinked > 0) {
        msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "township" : "townships"} under ${selected.length === 1 ? "this district" : "these districts"} that will also be deleted.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDeleteDistricts = useCallback(
    async (selected: DistrictWithParent[]) => {
      const ids = selected.map((d) => d.district_id);
      return deleteDistricts(ids);
    },
    [],
  );

  const renderDistrictToolbar = useCallback(
    (selected: DistrictWithParent[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDeleteDistricts}
            buildDescription={buildDistrictDescription}
            itemLabel="district"
          />
        )}
        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Add District <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreateDistrict(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/districts">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    ),
    [handleBulkDeleteDistricts, buildDistrictDescription, canCreate, canDelete],
  );

  // ─── Township tab ────────────────────────────────────────────────────
  const townshipColumns = useMemo(
    () => getTownshipColumns(listingCounts, stateRegions, districts),
    [listingCounts, stateRegions, districts],
  );

  const townshipFilterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "state_region_name",
        label: "State/Region",
        type: "multi-select",
        options: stateRegions.map((sr) => ({ label: sr.name, value: sr.name })),
      },
      {
        columnId: "district_name",
        label: "District",
        type: "multi-select",
        options: districts.map((d) => ({ label: d.name, value: d.name })),
      },
      { columnId: "created_at", label: "Created At", type: "date-range" },
    ],
    [stateRegions, districts],
  );

  const buildTownshipDescription = useCallback(
    async (selected: TownshipWithParents[]) => {
      const counts = await getListingCount();
      const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

      const names = selected.map((t) => `"${t.name}"`).join(", ");
      let msg = `${selected.length === 1 ? names : `${selected.length} townships (${names})`} will be moved to the trash.`;

      if (totalLinked > 0) {
        msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "listing" : "listings"} linked to ${selected.length === 1 ? "this township" : "these townships"} that must be removed first.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDeleteTownships = useCallback(
    async (selected: TownshipWithParents[]) => {
      const ids = selected.map((t) => t.township_id);
      return deleteTownships(ids);
    },
    [],
  );

  const renderTownshipToolbar = useCallback(
    (selected: TownshipWithParents[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDeleteTownships}
            buildDescription={buildTownshipDescription}
            itemLabel="township"
          />
        )}
        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Add Township <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreateTownship(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/locations">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    ),
    [handleBulkDeleteTownships, buildTownshipDescription, canCreate, canDelete],
  );

  return (
    <>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all"><Layers /> All</TabsTrigger>
          <TabsTrigger value="state-regions"><Map /> States/Regions</TabsTrigger>
          <TabsTrigger value="districts"><Landmark /> Districts</TabsTrigger>
          <TabsTrigger value="townships"><Building2 /> Townships</TabsTrigger>
        </TabsList>

        {/* ─── All Tab (Hierarchy Tree) ──────────────────────────────── */}
        <TabsContent value="all">
          {stateRegions.length > 0 ? (
            <LocationTree
              stateRegions={stateRegions}
              districtsWithParents={districtsWithParents}
              townships={townships}
            />
          ) : (
            <EmptyState
              icon={MapPin}
              title="No locations yet"
              description="Start by adding state/regions, then districts, then townships."
              action={
                canCreate ? (
                  <Button onClick={() => setShowCreateSR(true)}>
                    <Plus /> Add State/Region
                  </Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        {/* ─── State/Regions Tab ─────────────────────────────────────── */}
        <TabsContent value="state-regions">
          {stateRegions.length > 0 ? (
            <DataTable
              columns={srColumns}
              data={stateRegions}
              searchKeys={["name"]}
              searchPlaceholder="Search state/regions..."
              filterConfig={srFilterConfig}
              filterStorageKey="locations-sr-filters"
              enableSelection
              enablePagination
              pageSize={15}
              getRowId={(row) => row.state_region_id}
              toolbar={renderSRToolbar}
              enableExport
              exportFileName="state-regions"
            />
          ) : (
            <EmptyState
              icon={MapPin}
              title="No state/regions yet"
              description="Get started by creating your first state or region."
              action={
                canCreate ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        <Plus /> Add State/Region <ChevronDown className="ml-1 size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuItem onClick={() => setShowCreateSR(true)}>
                        <FileText /> Fill Form
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/bulk-upload/state-regions">
                          <FileSpreadsheet /> Excel Upload
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        {/* ─── Districts Tab ─────────────────────────────────────────── */}
        <TabsContent value="districts">
          {districtsWithParents.length > 0 ? (
            <DataTable
              columns={districtColumns}
              data={districtsWithParents}
              searchKeys={["name", "state_region_name"]}
              searchPlaceholder="Search districts or state/regions..."
              filterConfig={districtFilterConfig}
              filterStorageKey="locations-district-filters"
              enableSelection
              enablePagination
              pageSize={15}
              getRowId={(row) => row.district_id}
              toolbar={renderDistrictToolbar}
              enableExport
              exportFileName="districts"
            />
          ) : (
            <EmptyState
              icon={MapPin}
              title="No districts yet"
              description="Get started by creating your first district."
              action={
                canCreate ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        <Plus /> Add District <ChevronDown className="ml-1 size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuItem onClick={() => setShowCreateDistrict(true)}>
                        <FileText /> Fill Form
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/bulk-upload/districts">
                          <FileSpreadsheet /> Excel Upload
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        {/* ─── Townships Tab ─────────────────────────────────────────── */}
        <TabsContent value="townships">
          {townships.length > 0 ? (
            <DataTable
              columns={townshipColumns}
              data={townships}
              searchKeys={["name", "district_name", "state_region_name"]}
              searchPlaceholder="Search townships, districts, or states..."
              filterConfig={townshipFilterConfig}
              filterStorageKey="locations-township-filters"
              enableSelection
              enablePagination
              pageSize={15}
              getRowId={(row) => row.township_id}
              toolbar={renderTownshipToolbar}
              enableExport
              exportFileName="townships"
            />
          ) : (
            <EmptyState
              icon={MapPin}
              title="No townships yet"
              description="Get started by creating your first township."
              action={
                canCreate ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        <Plus /> Add Township <ChevronDown className="ml-1 size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuItem onClick={() => setShowCreateTownship(true)}>
                        <FileText /> Fill Form
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/bulk-upload/locations">
                          <FileSpreadsheet /> Excel Upload
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <StateRegionForm
        open={showCreateSR}
        onOpenChange={setShowCreateSR}
      />

      <DistrictForm
        open={showCreateDistrict}
        onOpenChange={setShowCreateDistrict}
        stateRegions={stateRegions}
      />

      <TownshipForm
        open={showCreateTownship}
        onOpenChange={setShowCreateTownship}
        stateRegions={stateRegions}
        districts={districts}
      />
    </>
  );
}
