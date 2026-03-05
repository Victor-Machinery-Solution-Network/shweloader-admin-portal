"use client";

import { useState, useCallback } from "react";
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
  const [selectedTemplate, setSelectedTemplate] = useState("");
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

      onChange([...templateFields, ...customValues]);
    },
    [onChange],
  );

  // ─── Template selection ─────────────────────────────────────────────

  function handleTemplateSelect(templateName: string | null) {
    if (!templateName) {
      setSelectedTemplate("");
      return;
    }

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
    setSelectedTemplate(template.name);

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
  const hasRows = fields.length > 0 || customRows.length > 0;

  return (
    <>
      <div className="divide-y overflow-hidden rounded-xl border">
        {/* Template selector */}
        {templates.length > 0 && (
          <div className="bg-muted/30 px-4 py-3">
            <Combobox
              value={selectedTemplate}
              onValueChange={handleTemplateSelect}
              items={templateNames}
            >
              <ComboboxInput
                placeholder="Apply a template..."
                showClear={!!selectedTemplate}
              />
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
