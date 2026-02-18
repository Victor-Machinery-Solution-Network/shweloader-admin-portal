"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Type,
  Hash,
  ChevronDown as ChevronDownIcon,
  ToggleLeft,
  CalendarDays,
  Link,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { CustomFieldInput } from "./custom-field-input";
import {
  CUSTOM_FIELD_TYPES,
  FIELD_TYPE_LABELS,
  type CustomFieldType,
  type CustomFieldValue,
  type CustomFieldDefinition,
  type CustomFieldTemplateWithFields,
} from "@/types/custom-field";

// ─── Field type icons ──────────────────────────────────────────────────────

const FIELD_TYPE_ICONS: Record<
  CustomFieldType,
  React.ComponentType<{ className?: string }>
> = {
  text: Type,
  number: Hash,
  dropdown: ChevronDownIcon,
  boolean: ToggleLeft,
  date: CalendarDays,
  url: Link,
};

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
      value: match?.value ?? def.defaultValue ?? (def.type === "boolean" ? "false" : ""),
    };
  });
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
  const [fields, setFields] = useState<CustomFieldValue[]>(initialValues);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text");
  const [confirmSwitch, setConfirmSwitch] = useState<{
    template: CustomFieldTemplateWithFields;
    lostFields: string[];
  } | null>(null);

  // Track which template definition's options map to each field key
  const [fieldOptionsMap, setFieldOptionsMap] = useState<
    Record<string, string[]>
  >(() => {
    const map: Record<string, string[]> = {};
    // If initialValues came from a template, we don't know the options.
    // They'll be set when a template is selected.
    return map;
  });

  const updateFields = useCallback(
    (next: CustomFieldValue[]) => {
      setFields(next);
      onChange(next);
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

    // Check if switching would lose filled values
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

    // Build options map from template definitions
    const optMap: Record<string, string[]> = {};
    for (const def of template.fields) {
      if (def.type === "dropdown" && def.options) {
        optMap[def.key] = def.options;
      }
    }
    setFieldOptionsMap(optMap);

    updateFields(newFields);
    setConfirmSwitch(null);
  }

  // ─── Field management ──────────────────────────────────────────────

  function handleFieldChange(key: string, value: string) {
    updateFields(fields.map((f) => (f.key === key ? { ...f, value } : f)));
  }

  function handleFieldRemove(key: string) {
    updateFields(fields.filter((f) => f.key !== key));
  }

  function handleAddField() {
    if (!newFieldLabel.trim()) return;

    const existingKeys = fields.map((f) => f.key);
    const key = generateKey(newFieldLabel, existingKeys);
    const newField: CustomFieldValue = {
      key,
      label: newFieldLabel.trim(),
      type: newFieldType,
      value: newFieldType === "boolean" ? "false" : "",
    };

    updateFields([...fields, newField]);
    setNewFieldLabel("");
    setNewFieldType("text");
    setShowAddField(false);
  }

  // ─── Template combobox items ──────────────────────────────────────

  const templateNames = templates.map((t) => t.name);

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Template selector */}
      {templates.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Apply a template
          </Label>
          <Combobox
            value={selectedTemplate}
            onValueChange={handleTemplateSelect}
            items={templateNames}
          >
            <ComboboxInput
              placeholder="Select a template..."
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

      {/* Field list */}
      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((field) => (
            <CustomFieldInput
              key={field.key}
              field={field}
              options={fieldOptionsMap[field.key]}
              onChange={(value) => handleFieldChange(field.key, value)}
              onRemove={() => handleFieldRemove(field.key)}
            />
          ))}
        </div>
      )}

      {/* Add ad-hoc field */}
      <Collapsible open={showAddField} onOpenChange={setShowAddField}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full">
            <Plus className="size-4" /> Add Custom Field
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-3 rounded-xl border bg-card p-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Field Label</Label>
              <Input
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="e.g. Serial Number"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddField();
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Field Type</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={2}
                value={newFieldType}
                onValueChange={(value) => {
                  if (value) setNewFieldType(value as CustomFieldType);
                }}
                className="flex-wrap"
              >
                {CUSTOM_FIELD_TYPES.filter((t) => t !== "dropdown").map(
                  (type) => {
                    const Icon = FIELD_TYPE_ICONS[type];
                    return (
                      <ToggleGroupItem
                        key={type}
                        value={type}
                        className="gap-1.5 px-3 text-xs"
                      >
                        <Icon className="size-3.5" />
                        {FIELD_TYPE_LABELS[type]}
                      </ToggleGroupItem>
                    );
                  },
                )}
              </ToggleGroup>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAddField}
              disabled={!newFieldLabel.trim()}
            >
              Add
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

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
    </div>
  );
}
