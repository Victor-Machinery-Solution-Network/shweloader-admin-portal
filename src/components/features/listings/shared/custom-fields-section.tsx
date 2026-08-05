"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FieldValueInput } from "./custom-field-input";
import type {
  CustomFieldValue,
  CustomFieldTemplateWithFields,
} from "@/types/custom-field";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function fieldsFromTemplate(
  template: CustomFieldTemplateWithFields,
  existing: CustomFieldValue[],
): CustomFieldValue[] {
  return template.fields.map((def) => {
    const match = existing.find((v) => v.key === def.key);
    return {
      key: def.key,
      label: def.label,
      type: def.type,
      value:
        match?.value ??
        def.defaultValue ??
        (def.type === "boolean" ? "false" : ""),
    };
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface CustomRow {
  id: string;
  label: string;
  value: string;
}

// ─── Template inference ───────────────────────────────────────────────────

/** Shown in the picker when saved custom fields exist but match no template
 *  (ad-hoc-only fields, or the original template was deleted) — keeps the edit
 *  form from rendering a blank selector. */
const CUSTOM_TEMPLATE_LABEL = "Custom Fields";

/**
 * Infer which template a listing's saved custom fields came from, to preselect
 * the edit-form picker. A listing built from a template always *contains* that
 * template's fields (the admin can only add ad-hoc rows on top), so a template
 * matches when all of its field keys are present; the most specific (largest)
 * matching template wins. Returns "" when there are no custom fields (a fresh
 * form), or the "Custom" label when fields exist but match no template.
 */
function inferTemplateLabel(
  values: CustomFieldValue[],
  templates: CustomFieldTemplateWithFields[],
): string {
  if (values.length === 0) return "";
  const keys = new Set(values.map((v) => v.key));
  let best = "";
  let bestSize = 0;
  for (const t of templates) {
    if (t.fields.length > bestSize && t.fields.every((f) => keys.has(f.key))) {
      best = t.name;
      bestSize = t.fields.length;
    }
  }
  return best || CUSTOM_TEMPLATE_LABEL;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface CustomFieldsSectionProps {
  templates: CustomFieldTemplateWithFields[];
  initialValues?: CustomFieldValue[];
  onChange: (values: CustomFieldValue[]) => void;
}

export function CustomFieldsSection({
  templates,
  initialValues = [],
  onChange,
}: CustomFieldsSectionProps) {
  // Template/existing fields (with proper types from template definition)
  const [fields, setFields] = useState<CustomFieldValue[]>(initialValues);
  const [confirmSwitch, setConfirmSwitch] = useState<{
    template: CustomFieldTemplateWithFields;
    lostFields: string[];
  } | null>(null);

  // Track dropdown options from template definitions
  const [fieldOptionsMap, setFieldOptionsMap] = useState<
    Record<string, string[]>
  >({});

  // Ad-hoc custom rows (always text type, user provides name + value)
  const [customRows, setCustomRows] = useState<CustomRow[]>([
    { id: crypto.randomUUID(), label: "", value: "" },
  ]);

  // The template label shown in the picker, derived live from the current fields
  // (template fields + labeled ad-hoc rows) — the same merged set that gets
  // saved. So it updates as you edit: removing a template field flips it to
  // "Custom" immediately, no save/refresh needed. "" on a fresh form.
  const selectedTemplate = useMemo(() => {
    const merged: CustomFieldValue[] = [...fields];
    for (const r of customRows) {
      if (!r.label.trim()) continue;
      merged.push({
        key: generateKey(r.label, merged.map((v) => v.key)),
        label: r.label.trim(),
        type: "text",
        value: r.value,
      });
    }
    return inferTemplateLabel(merged, templates);
  }, [fields, customRows, templates]);

  // ─── Merge & report ─────────────────────────────────────────────────

  const reportChange = useCallback(
    (templateFields: CustomFieldValue[], rows: CustomRow[]) => {
      const existingKeys = templateFields.map((f) => f.key);
      const customValues: CustomFieldValue[] = [];

      for (const r of rows) {
        if (!r.label.trim()) continue;
        const allKeys = [...existingKeys, ...customValues.map((v) => v.key)];
        const key = generateKey(r.label, allKeys);
        customValues.push({
          key,
          label: r.label.trim(),
          type: "text",
          value: r.value,
        });
      }

      // Trim on the way out — labels were already trimmed above, but values
      // went out raw, and pasted values routinely carry a leading/trailing
      // space. That reaches the public spec table verbatim (" Yangon",
      // "169000 Km "). Single choke point: onChange is only called here.
      onChange(
        [...templateFields, ...customValues].map((v) => ({
          ...v,
          value: v.value.trim(),
        })),
      );
    },
    [onChange],
  );

  // ─── Template selection ─────────────────────────────────────────────

  function handleTemplateSelect(templateName: string | null) {
    if (!templateName) return;

    const template = templates.find((t) => t.name === templateName);
    if (!template) return;

    if (fields.length > 0) {
      const newKeys = new Set(template.fields.map((f) => f.key));
      const lostFields = fields
        .filter((f) => f.value && !newKeys.has(f.key))
        .map((f) => f.label);

      if (lostFields.length > 0) {
        setConfirmSwitch({ template, lostFields });
        return;
      }
    }

    applyTemplate(template);
  }

  function applyTemplate(template: CustomFieldTemplateWithFields) {
    const newFields = fieldsFromTemplate(template, fields);

    const optMap: Record<string, string[]> = {};
    for (const def of template.fields) {
      if (def.type === "dropdown" && def.options) {
        optMap[def.key] = def.options;
      }
    }
    setFieldOptionsMap(optMap);

    setFields(newFields);
    reportChange(newFields, customRows);
    setConfirmSwitch(null);
  }

  // ─── Template field management ──────────────────────────────────────

  function handleFieldChange(key: string, value: string) {
    const next = fields.map((f) => (f.key === key ? { ...f, value } : f));
    setFields(next);
    reportChange(next, customRows);
  }

  function handleFieldRemove(key: string) {
    const next = fields.filter((f) => f.key !== key);
    setFields(next);
    reportChange(next, customRows);
  }

  // ─── Custom row management ──────────────────────────────────────────

  function handleRowChange(
    id: string,
    field: "label" | "value",
    val: string,
  ) {
    const next = customRows.map((r) =>
      r.id === id ? { ...r, [field]: val } : r,
    );
    setCustomRows(next);
    reportChange(fields, next);
  }

  function handleRowRemove(id: string) {
    let next = customRows.filter((r) => r.id !== id);
    if (next.length === 0) {
      next = [{ id: crypto.randomUUID(), label: "", value: "" }];
    }
    setCustomRows(next);
    reportChange(fields, next);
  }

  function addRow() {
    setCustomRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", value: "" },
    ]);
  }

  // ─── Render ─────────────────────────────────────────────────────────

  const templateNames = templates.map((t) => t.name);
  // Expose the "Custom" sentinel in the list only while it's the active value,
  // so the combobox can render it without offering it as a normal apply choice.
  const comboItems =
    selectedTemplate === CUSTOM_TEMPLATE_LABEL
      ? [...templateNames, CUSTOM_TEMPLATE_LABEL]
      : templateNames;

  return (
    <>
      <div className="divide-y overflow-hidden rounded-xl border">
        {/* Template selector */}
        {templates.length > 0 && (
          <div className="bg-muted/30 px-4 py-3">
            <Combobox
              value={selectedTemplate}
              onValueChange={handleTemplateSelect}
              items={comboItems}
            >
              {/* No clear (×): the label is derived from the current fields, so
                  "clearing" has no meaning — change templates by selecting
                  another, or remove the fields. */}
              <ComboboxInput placeholder="Apply a template..." />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No templates found</ComboboxEmpty>
                  <ComboboxCollection>
                    {(name) => (
                      <ComboboxItem key={name} value={name}>
                        {name}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        )}

        {/* Template/existing field rows */}
        {fields.map((field) => (
          <div
            key={field.key}
            className="group flex items-center gap-3 px-4 py-3"
          >
            <span className="w-2/5 shrink-0 truncate text-sm font-medium">
              {field.label}
            </span>
            <div className="min-w-0 flex-1">
              <FieldValueInput
                field={field}
                options={fieldOptionsMap[field.key]}
                onChange={(value) => handleFieldChange(field.key, value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleFieldRemove(field.key)}
            >
              <X className="size-4" />
              <span className="sr-only">Remove {field.label}</span>
            </Button>
          </div>
        ))}

        {/* Custom field rows */}
        {customRows.map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-4 py-3">
            <Input
              value={row.label}
              onChange={(e) => handleRowChange(row.id, "label", e.target.value)}
              placeholder="Field name"
              className="w-2/5 shrink-0"
              autoComplete="off"
            />
            <Input
              value={row.value}
              onChange={(e) => handleRowChange(row.id, "value", e.target.value)}
              placeholder="Value"
              className="min-w-0 flex-1"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRowRemove(row.id)}
            >
              <X className="size-4" />
              <span className="sr-only">Remove row</span>
            </Button>
          </div>
        ))}

        {/* Add row button */}
        <div className="px-4 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={addRow}
          >
            <Plus className="size-4" /> Add field
          </Button>
        </div>
      </div>

      {/* Confirmation dialog for template switch */}
      <Dialog
        open={!!confirmSwitch}
        onOpenChange={(open) => {
          if (!open) setConfirmSwitch(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch template?</DialogTitle>
            <DialogDescription>
              Switching to &ldquo;{confirmSwitch?.template.name}&rdquo; will
              remove the following filled fields:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            {confirmSwitch?.lostFields.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmSwitch(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (confirmSwitch) applyTemplate(confirmSwitch.template);
              }}
            >
              Switch Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
