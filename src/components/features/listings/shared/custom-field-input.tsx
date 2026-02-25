"use client";

import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import type { CustomFieldValue } from "@/types/custom-field";

interface FieldValueInputProps {
  field: CustomFieldValue;
  options?: string[];
  onChange: (value: string) => void;
}

/** Renders the appropriate value input for a custom field type. No wrapper, no label. */
export function FieldValueInput({
  field,
  options,
  onChange,
}: FieldValueInputProps) {
  switch (field.type) {
    case "text":
      return (
        <Input
          value={field.value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Value"
          autoComplete="off"
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={field.value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Value"
        />
      );

    case "url":
      return (
        <Input
          type="url"
          value={field.value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          autoComplete="off"
        />
      );

    case "dropdown":
      return (
        <Combobox
          value={field.value}
          onValueChange={(val) => onChange(val ?? "")}
          items={options ?? []}
        >
          <ComboboxInput
            placeholder="Search..."
            showClear={!!field.value}
          />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxEmpty>No options found</ComboboxEmpty>
              <ComboboxCollection>
                {(opt) => (
                  <ComboboxItem key={opt} value={opt}>
                    {opt}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={field.value === "true"}
            onCheckedChange={(checked) => onChange(String(checked))}
          />
          <span className="text-muted-foreground text-sm">
            {field.value === "true" ? "Yes" : "No"}
          </span>
        </div>
      );

    case "date":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !field.value && "text-muted-foreground",
              )}
            >
              <CalendarDays className="mr-2 size-4" />
              {field.value
                ? new Date(field.value).toLocaleDateString()
                : "Pick a date..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={field.value ? new Date(field.value) : undefined}
              onSelect={(date) =>
                onChange(date ? date.toISOString().split("T")[0] : "")
              }
            />
          </PopoverContent>
        </Popover>
      );
  }
}
