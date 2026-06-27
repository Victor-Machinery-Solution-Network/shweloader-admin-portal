"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { LayoutTemplate, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { FIELD_TYPE_LABELS, CUSTOM_FIELD_TYPES } from "@/types/custom-field";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { createColumns } from "./columns";
import { deleteCustomFieldTemplates } from "@/lib/actions/custom-field-template";
import { ROUTES } from "@/lib/constants";
import type { CustomFieldTemplateWithFields } from "@/types/custom-field";

interface TemplatesClientProps {
  templates: CustomFieldTemplateWithFields[];
}

export function TemplatesClient({ templates }: TemplatesClientProps) {
  const canCreate = useHasPermission("listing_templates", "create");
  const canExport = useHasPermission("listing_templates", "export");
  const canDelete = useHasPermission("listing_templates", "delete");
  const columns = useMemo(() => createColumns(), []);

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "field_types",
        label: "Field Types",
        type: "multi-select",
        options: CUSTOM_FIELD_TYPES.map((t) => ({
          label: FIELD_TYPE_LABELS[t],
          value: t,
        })),
      },
      { columnId: "created_at", label: "Created At", type: "date-range" },
    ],
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: CustomFieldTemplateWithFields[]) => {
      const ids = selected.map((t) => t.template_id);
      return deleteCustomFieldTemplates(ids);
    },
    [],
  );

  const buildDescription = useCallback(
    async (selected: CustomFieldTemplateWithFields[]) => {
      const count = selected.length;
      const plural = count === 1 ? "template" : "templates";
      return `${count} ${plural} will be moved to the trash. Existing listings using these fields will not be affected.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: CustomFieldTemplateWithFields[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="template"
          />
        )}
        {canCreate && (
          <Button asChild className="ml-auto">
            <Link href={ROUTES.LISTING_TEMPLATES_NEW}>
              <Plus /> Add Template
            </Link>
          </Button>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canCreate, canDelete],
  );

  return templates.length > 0 ? (
    <DataTable
      columns={columns}
      data={templates}
      searchKeys={["name"]}
      searchPlaceholder="Search templates"
      filterConfig={filterConfig}
      filterStorageKey="templates-filters"
      enableSelection
      enablePagination
      pageSize={10}
      getRowId={(row) => row.template_id}
      toolbar={renderToolbar}
      enableExport={canExport}
      exportFileName="listing-templates"
    />
  ) : (
    <EmptyState
      icon={LayoutTemplate}
      title="No templates yet"
      description="Create reusable field templates to quickly add custom fields to listings."
      action={
        canCreate ? (
          <Button asChild>
            <Link href={ROUTES.LISTING_TEMPLATES_NEW}>
              <Plus /> Add Template
            </Link>
          </Button>
        ) : undefined
      }
    />
  );
}
