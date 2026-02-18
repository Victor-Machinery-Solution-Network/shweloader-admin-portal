"use client";

import { useState, useCallback, useTransition } from "react";
import { Plus, LayoutTemplate, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Button } from "@/components/ui/button";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FormDialog } from "@/components/shared/form-dialog";
import { TemplateFieldCard } from "./template-field-card";
import {
  createCustomFieldTemplate,
  updateCustomFieldTemplate,
} from "@/lib/actions/custom-field-template";
import type {
  CustomFieldDefinition,
  CustomFieldTemplateWithFields,
} from "@/types/custom-field";

// ─── Helpers ────────────────────────────────────────────────────────────────

let fieldCounter = 0;

function generateKey(label: string, existingKeys: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "field";

  let key = base;
  let suffix = 1;
  while (existingKeys.includes(key)) {
    key = `${base}-${suffix}`;
    suffix++;
  }
  return key;
}

function createEmptyField(existingKeys: string[]): CustomFieldDefinition {
  fieldCounter++;
  const key = generateKey(`field-${fieldCounter}`, existingKeys);
  return {
    key,
    label: "",
    type: "text",
    required: false,
    order: 0,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: CustomFieldTemplateWithFields;
}

export function TemplateForm({
  open,
  onOpenChange,
  template,
}: TemplateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [newFieldKey, setNewFieldKey] = useState<string | null>(null);
  const isEditing = !!template;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setFields(
          template?.fields.map((f, i) => ({ ...f, order: i })) ?? [],
        );
        setNewFieldKey(null);
      }
      onOpenChange(nextOpen);
    },
    [template, onOpenChange],
  );

  // ─── Field management ──────────────────────────────────────────────────

  function addField() {
    setFields((prev) => {
      const existing = prev.map((f) => f.key);
      const newField = createEmptyField(existing);
      newField.order = prev.length;
      setNewFieldKey(newField.key);
      return [...prev, newField];
    });
  }

  function updateField(key: string, updated: CustomFieldDefinition) {
    setFields((prev) => prev.map((f) => (f.key === key ? updated : f)));
  }

  function removeField(key: string) {
    setFields((prev) => {
      const filtered = prev.filter((f) => f.key !== key);
      return filtered.map((f, i) => ({ ...f, order: i }));
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.key === active.id);
      const newIndex = prev.findIndex((f) => f.key === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove([...prev], oldIndex, newIndex);
      return reordered.map((f, i) => ({ ...f, order: i }));
    });
  }

  // ─── Submit ───────────────────────────────────────────────────────────

  function handleSubmit(formData: FormData) {
    // Re-key fields based on final labels before saving
    const existingKeys: string[] = [];
    const finalFields = fields.map((f, i) => {
      const key = f.label.trim()
        ? generateKey(f.label, existingKeys)
        : f.key;
      existingKeys.push(key);
      return { ...f, key, order: i };
    });

    formData.set("fields", JSON.stringify(finalFields));

    startTransition(async () => {
      const result = isEditing
        ? await updateCustomFieldTemplate(template.template_id, formData)
        : await createCustomFieldTemplate(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Template updated" : "Template created",
        );
        handleOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Edit Template" : "Add Template"}
      description={
        isEditing
          ? "Update the template name and fields."
          : "Create a reusable set of custom fields for listings."
      }
      icon={
        isEditing ? (
          <Pencil className="text-primary-foreground size-6" />
        ) : (
          <LayoutTemplate className="text-primary-foreground size-6" />
        )
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
      className="sm:max-w-3xl"
    >
      <div className="space-y-6">
        {/* Template Name */}
        <Field orientation="vertical">
          <FieldLabel>Template Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Excavator Specs"
              defaultValue={template?.name ?? ""}
              errorMessage="Template name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        {/* Fields */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Fields{" "}
              {fields.length > 0 && (
                <span className="font-normal text-muted-foreground">
                  ({fields.length})
                </span>
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addField}
            >
              <Plus className="size-4" /> Add Field
            </Button>
          </div>

          {fields.length > 0 ? (
            <ScrollArea className="max-h-[50vh]">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fields.map((f) => f.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 pr-3">
                    {fields.map((field) => (
                      <TemplateFieldCard
                        key={field.key}
                        field={field}
                        defaultExpanded={field.key === newFieldKey}
                        onChange={(updated) =>
                          updateField(field.key, updated)
                        }
                        onRemove={() => removeField(field.key)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No fields yet. Click &ldquo;Add Field&rdquo; to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </FormDialog>
  );
}
