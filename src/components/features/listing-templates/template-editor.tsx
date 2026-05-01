"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import {
  RequiredInput,
  FormSubmittedContext,
} from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { TemplateFieldCard } from "./template-field-card";
import {
  createCustomFieldTemplate,
  updateCustomFieldTemplate,
} from "@/lib/actions/custom-field-template";
import { ROUTES } from "@/lib/constants";
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

interface TemplateEditorProps {
  template?: CustomFieldTemplateWithFields;
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [fields, setFields] = useState<CustomFieldDefinition[]>(
    template?.fields.map((f, i) => ({ ...f, order: i })) ?? [],
  );
  const [newFieldKey, setNewFieldKey] = useState<string | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);

  const isEditing = !!template;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // ─── Field management ──────────────────────────────────────────────────

  const addField = useCallback(() => {
    setFields((prev) => {
      const existing = prev.map((f) => f.key);
      const newField = createEmptyField(existing);
      newField.order = prev.length;
      setNewFieldKey(newField.key);
      return [...prev, newField];
    });
  }, []);

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);

    if (!e.currentTarget.checkValidity()) return;

    if (fields.length === 0) {
      toast.error("At least one field is required");
      return;
    }

    if (fields.some((f) => !f.label.trim())) {
      setValidationAttempt((v) => v + 1);
      toast.error("All fields must have a label");
      return;
    }

    // Re-key fields based on final labels before saving
    const existingKeys: string[] = [];
    const finalFields = fields.map((f, i) => {
      const key = f.label.trim() ? generateKey(f.label, existingKeys) : f.key;
      existingKeys.push(key);
      return { ...f, key, order: i };
    });

    const formData = new FormData(e.currentTarget);
    formData.set("fields", JSON.stringify(finalFields));

    startTransition(async () => {
      const result = isEditing
        ? await updateCustomFieldTemplate(template.template_id, formData)
        : await createCustomFieldTemplate(formData);

      if (result.success) {
        toast.success(isEditing ? "Template updated" : "Template created");
        router.push(ROUTES.LISTING_TEMPLATES);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="-m-6 flex min-h-0 flex-1 flex-col"
    >
      <FormSubmittedContext value={submitted}>
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="bg-background/95 sticky top-0 z-10 border-b px-6 py-4 backdrop-blur-sm">
          <Link
            href={ROUTES.LISTING_TEMPLATES}
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Templates
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isEditing ? "Edit Template" : "New Template"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isEditing
                  ? "Update the template name and fields."
                  : "Create a reusable set of custom fields for listings."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  if (!isEditing) {
                    window.location.href = ROUTES.LISTING_TEMPLATES;
                    return;
                  }
                  router.push(ROUTES.LISTING_TEMPLATES);
                }}
              >
                Discard
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner className="mr-1" /> Saving…
                  </>
                ) : isEditing ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-8 px-6 py-6">
            {/* Template Name */}
            <Field orientation="vertical">
              <FieldLabel className="pt-4">
                Template Name <span className="text-destructive">*</span>
              </FieldLabel>
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
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">
                  Fields{" "}
                  {fields.length > 0 && (
                    <span className="font-normal text-muted-foreground">
                      ({fields.length})
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Define the custom fields for this template.
                </p>
              </div>

              {fields.length > 0 ? (
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
                    <div className="space-y-2">
                      {fields.map((field) => (
                        <TemplateFieldCard
                          key={field.key}
                          field={field}
                          defaultExpanded={field.key === newFieldKey}
                          showLabelError={
                            validationAttempt > 0 && !field.label.trim()
                          }
                          validationAttempt={validationAttempt}
                          onChange={(updated) =>
                            updateField(field.key, updated)
                          }
                          onRemove={() => removeField(field.key)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={addField}
              >
                <Plus className="size-4" /> Add Field
              </Button>
            </div>
          </div>
        </div>
      </FormSubmittedContext>
    </form>
  );
}
