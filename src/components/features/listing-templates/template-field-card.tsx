"use client";

import { useState } from "react";
import {
  GripVertical,
  Trash2,
  ChevronDown,
  Type,
  Hash,
  ChevronDownIcon,
  ToggleLeft,
  CalendarDays,
  Link,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  type CustomFieldDefinition,
  type CustomFieldType,
} from "@/types/custom-field";

// ─── Field type icons ──────────────────────────────────────────────────────

const FIELD_TYPE_ICONS: Record<CustomFieldType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  dropdown: ChevronDownIcon,
  boolean: ToggleLeft,
  date: CalendarDays,
  url: Link,
};

// ─── Component ──────────────────────────────────────────────────────────────

interface TemplateFieldCardProps {
  field: CustomFieldDefinition;
  defaultExpanded?: boolean;
  onChange: (updated: CustomFieldDefinition) => void;
  onRemove: () => void;
}

export function TemplateFieldCard({
  field,
  defaultExpanded = false,
  onChange,
  onRemove,
}: TemplateFieldCardProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

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

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="truncate text-sm font-medium">
                {field.label || "Untitled field"}
              </span>
              <Badge variant="secondary" className="shrink-0 text-xs gap-1">
                <Icon className="size-3" />
                {FIELD_TYPE_LABELS[field.type]}
              </Badge>
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
            className="shrink-0 text-muted-foreground hover:text-destructive"
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
              />
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
                    }
                    updateField(updates);
                  }
                }}
                className="flex-wrap"
              >
                {CUSTOM_FIELD_TYPES.map((type) => {
                  const TypeIcon = FIELD_TYPE_ICONS[type];
                  return (
                    <ToggleGroupItem
                      key={type}
                      value={type}
                      className="gap-1.5 px-3 text-xs"
                    >
                      <TypeIcon className="size-3.5" />
                      {FIELD_TYPE_LABELS[type]}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>

            {/* Required toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) =>
                  updateField({ required: checked })
                }
                id={`required-${field.key}`}
              />
              <Label htmlFor={`required-${field.key}`} className="text-xs">
                Required
              </Label>
            </div>

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
                  value={field.options?.join(", ") ?? ""}
                  onChange={(e) =>
                    updateField({
                      options: e.target.value
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
                <Input
                  value={field.defaultValue ?? ""}
                  onChange={(e) =>
                    updateField({ defaultValue: e.target.value || undefined })
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
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
