"use client";

import { useState, useCallback, useMemo } from "react";
import { LayoutTemplate, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { FIELD_TYPE_LABELS, CUSTOM_FIELD_TYPES } from "@/types/custom-field";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { TemplateForm } from "./template-form";
import { createColumns } from "./columns";
import { deleteCustomFieldTemplates } from "@/lib/actions/custom-field-template";
import type { CustomFieldTemplateWithFields } from "@/types/custom-field";

interface TemplatesClientProps {
  templates: CustomFieldTemplateWithFields[];
}

export function TemplatesClient({ templates }: TemplatesClientProps) {
  const canCreate = useHasPermission("listing_templates", "create");
  const canDelete = useHasPermission("listing_templates", "delete");
  const [showCreate, setShowCreate] = useState(false);
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
      { columnId: "created_at", label: "Created", type: "date-range" },
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
      return `This will permanently delete ${count} ${plural}. Existing listings using these fields will not be affected.`;
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
          <Button onClick={() => setShowCreate(true)} className="ml-auto">
            <Plus /> Add Template
          </Button>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canCreate, canDelete],
  );

  return (
    <>
      {templates.length > 0 ? (
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
        />
      ) : (
        <EmptyState
          icon={LayoutTemplate}
          title="No templates yet"
          description="Create reusable field templates to quickly add custom fields to listings."
          action={
            canCreate ? (
              <Button onClick={() => setShowCreate(true)}>
                <Plus /> Add Template
              </Button>
            ) : undefined
          }
        />
      )}

      <TemplateForm
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </>
  );
}
