"use client";

import { useState } from "react";
import {
  GripVertical,
  Trash2,
  ChevronDown,
  CalendarDays,
  Asterisk,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CUSTOM_FIELD_TYPES,
  FIELD_TYPE_LABELS,
  FIELD_TYPE_ICONS,
  type CustomFieldDefinition,
  type CustomFieldType,
} from "@/types/custom-field";

// ─── Field type config ─────────────────────────────────────────────────────

const FIELD_TYPE_COLORS: Record<CustomFieldType, { iconColor: string; iconBg: string }> = {
  text: { iconColor: "text-blue-500", iconBg: "bg-blue-500/10" },
  number: { iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" },
  dropdown: { iconColor: "text-violet-500", iconBg: "bg-violet-500/10" },
  boolean: { iconColor: "text-amber-500", iconBg: "bg-amber-500/10" },
  date: { iconColor: "text-rose-500", iconBg: "bg-rose-500/10" },
  url: { iconColor: "text-cyan-500", iconBg: "bg-cyan-500/10" },
};

// ─── Component ──────────────────────────────────────────────────────────────

interface TemplateFieldCardProps {
  field: CustomFieldDefinition;
  defaultExpanded?: boolean;
  showLabelError?: boolean;
  validationAttempt?: number;
  onChange: (updated: CustomFieldDefinition) => void;
  onRemove: () => void;
}

export function TemplateFieldCard({
  field,
  defaultExpanded = false,
  showLabelError,
  validationAttempt,
  onChange,
  onRemove,
}: TemplateFieldCardProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [optionsText, setOptionsText] = useState(field.options?.join(", ") ?? "");

  // Sync optionsText when field type switches to dropdown — prev-state pattern.
  const [prevFieldType, setPrevFieldType] = useState(field.type);
  if (prevFieldType !== field.type) {
    setPrevFieldType(field.type);
    if (field.type === "dropdown") {
      setOptionsText(field.options?.join(", ") ?? "");
    }
  }

  // Auto-expand when validation fails and this field has an empty label.
  const [prevValidationAttempt, setPrevValidationAttempt] = useState(validationAttempt);
  if (prevValidationAttempt !== validationAttempt) {
    setPrevValidationAttempt(validationAttempt);
    if (showLabelError) setIsOpen(true);
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function updateField(updates: Partial<CustomFieldDefinition>) {
    onChange({ ...field, ...updates });
  }

  const Icon = FIELD_TYPE_ICONS[field.type];
  const colors = FIELD_TYPE_COLORS[field.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card transition-shadow",
        isDragging && "z-50 shadow-lg ring-2 ring-primary",
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Collapsed header */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            aria-label="Reorder field"
            className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>

          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md",
              colors.iconBg,
            )}
          >
            <Icon className={cn("size-3.5", colors.iconColor)} />
          </div>

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="truncate text-sm font-medium">
                {field.label || "Untitled field"}
              </span>
              <span className={cn("shrink-0 text-xs", colors.iconColor)}>
                {FIELD_TYPE_LABELS[field.type]}
              </span>
              {field.required && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  Required
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-destructive hover:text-destructive/80"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">Remove field</span>
          </Button>
        </div>

        {/* Expanded content */}
        <CollapsibleContent>
          <div className="space-y-4 border-t px-3 py-3">
            {/* Label */}
            <div className="space-y-1.5">
              <Label className="text-xs">Label</Label>
              <Input
                value={field.label}
                onChange={(e) => updateField({ label: e.target.value })}
                placeholder="e.g. Engine Hours"
                autoComplete="off"
                className={cn(showLabelError && "border-destructive")}
              />
              {showLabelError && (
                <p className="text-xs text-destructive">
                  Field label is required
                </p>
              )}
            </div>

            {/* Type picker */}
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={2}
                value={field.type}
                onValueChange={(value) => {
                  if (value) {
                    const updates: Partial<CustomFieldDefinition> = {
                      type: value as CustomFieldType,
                    };
                    if (value !== "dropdown") {
                      updates.options = undefined;
                    }
                    if (value === "boolean") {
                      updates.defaultValue = "false";
                    } else {
                      updates.defaultValue = undefined;
                    }
                    updateField(updates);
                  }
                }}
                className="flex-wrap"
              >
                {CUSTOM_FIELD_TYPES.map((type) => {
                  const TypeIcon = FIELD_TYPE_ICONS[type];
                  const typeColors = FIELD_TYPE_COLORS[type];
                  const isSelected = field.type === type;
                  return (
                    <ToggleGroupItem
                      key={type}
                      value={type}
                      className="gap-1.5 px-3 text-xs"
                    >
                      <TypeIcon
                        className={cn(
                          "size-3.5",
                          isSelected ? "text-black" : typeColors.iconColor,
                        )}
                      />
                      {FIELD_TYPE_LABELS[type]}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>

            {/* Required toggle */}
            <label className="flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Asterisk className="size-4 text-muted-foreground" />
                <span className="text-sm">Required field</span>
              </div>
              <Switch
                checked={field.required}
                onCheckedChange={(checked) =>
                  updateField({ required: checked })
                }
              />
            </label>

            {/* Dropdown options (only for dropdown type) */}
            {field.type === "dropdown" && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Options{" "}
                  <span className="font-normal text-muted-foreground">
                    (comma-separated)
                  </span>
                </Label>
                <Input
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  onBlur={() =>
                    updateField({
                      options: optionsText
                        .split(",")
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="e.g. Diesel, Electric, Hybrid"
                  autoComplete="off"
                />
              </div>
            )}

            {/* Default value */}
            {field.type !== "boolean" && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Default Value{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                {field.type === "date" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.defaultValue && "text-muted-foreground",
                        )}
                      >
                        <CalendarDays className="mr-2 size-4" />
                        {field.defaultValue
                          ? new Date(field.defaultValue).toLocaleDateString()
                          : "Pick a date..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          field.defaultValue
                            ? new Date(field.defaultValue)
                            : undefined
                        }
                        onSelect={(date) =>
                          updateField({
                            defaultValue: date
                              ? date.toISOString().split("T")[0]
                              : undefined,
                          })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    value={field.defaultValue ?? ""}
                    onChange={(e) =>
                      updateField({
                        defaultValue: e.target.value || undefined,
                      })
                    }
                    placeholder={
                      field.type === "number"
                        ? "e.g. 0"
                        : field.type === "url"
                          ? "e.g. https://..."
                          : "e.g. N/A"
                    }
                    type={field.type === "number" ? "number" : "text"}
                    autoComplete="off"
                  />
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
