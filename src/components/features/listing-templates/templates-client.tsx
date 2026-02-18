"use client";

import { useState, useCallback, useMemo } from "react";
import { LayoutTemplate, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
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
  const [showCreate, setShowCreate] = useState(false);
  const columns = useMemo(() => createColumns(), []);

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
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          buildDescription={buildDescription}
          itemLabel="template"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Add Template
        </Button>
      </>
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      {templates.length > 0 ? (
        <DataTable
          columns={columns}
          data={templates}
          searchKey="name"
          searchPlaceholder="Search templates"
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
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Template
            </Button>
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
