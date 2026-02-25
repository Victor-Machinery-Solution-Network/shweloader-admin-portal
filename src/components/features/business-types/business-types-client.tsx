"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Briefcase, ChevronDown, FileText, FileSpreadsheet, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FilterConfig } from "@/types/data-table-filters";

import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { BusinessTypeForm } from "./business-type-form";
import { columns } from "./columns";
import {
  deleteBusinessTypes,
  getUserCount,
} from "@/lib/actions/business-type";
import type { BusinessType } from "@/types/app-user";

interface BusinessTypesClientProps {
  businessTypes: BusinessType[];
}

export function BusinessTypesClient({
  businessTypes,
}: BusinessTypesClientProps) {
  const canCreate = useHasPermission("business_types", "create");
  const canDelete = useHasPermission("business_types", "delete");
  const [showCreate, setShowCreate] = useState(false);

  const filterConfig = useMemo<FilterConfig[]>(
    () => [{ columnId: "created_at", label: "Created", type: "date-range" }],
    [],
  );

  const buildDescription = useCallback(
    async (selected: BusinessType[]) => {
      const ids = selected.map((bt) => bt.business_type_id);
      const counts = await getUserCount(ids);
      const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

      const names = selected.map((bt) => `"${bt.name}"`).join(", ");
      let msg = `This will permanently delete ${selected.length === 1 ? names : `${selected.length} business types (${names})`}.`;

      if (totalLinked > 0) {
        msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "user" : "users"} using ${selected.length === 1 ? "this business type" : "these business types"}.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: BusinessType[]) => {
      const ids = selected.map((bt) => bt.business_type_id);
      return deleteBusinessTypes(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: BusinessType[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="business type"
          />
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canDelete],
  );

  return (
    <>
      {canCreate && (
        <div className="flex justify-end mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Add Business Type <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreate(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/business-types">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {businessTypes.length > 0 ? (
        <DataTable
          columns={columns}
          data={businessTypes}
          searchKeys={["name"]}
          searchPlaceholder="Search business types"
          filterConfig={filterConfig}
          filterStorageKey="business-types-filters"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.business_type_id}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Briefcase}
          title="No business types yet"
          description="Get started by creating your first business type."
          action={
            canCreate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus /> Add Business Type <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setShowCreate(true)}>
                    <FileText /> Fill Form
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bulk-upload/business-types">
                      <FileSpreadsheet /> Excel Upload
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
      )}

      <BusinessTypeForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
