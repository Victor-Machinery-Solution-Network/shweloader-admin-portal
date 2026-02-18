"use client";

import { CalendarDays, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FIELD_TYPE_LABELS } from "@/types/custom-field";
import type { CustomFieldValue } from "@/types/custom-field";

interface CustomFieldInputProps {
  field: CustomFieldValue;
  options?: string[];
  required?: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}

export function CustomFieldInput({
  field,
  options,
  required,
  onChange,
  onRemove,
}: CustomFieldInputProps) {
  return (
    <div className="group flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          <Badge variant="secondary" className="text-[10px]">
            {FIELD_TYPE_LABELS[field.type]}
          </Badge>
          {required && (
            <span className="text-destructive text-xs">*</span>
          )}
        </div>

        {field.type === "text" && (
          <Input
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter text..."
            autoComplete="off"
          />
        )}

        {field.type === "number" && (
          <Input
            type="number"
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter number..."
          />
        )}

        {field.type === "url" && (
          <Input
            type="url"
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            autoComplete="off"
          />
        )}

        {field.type === "dropdown" && (
          <Select value={field.value} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {(options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === "boolean" && (
          <div className="flex items-center gap-2 pt-0.5">
            <Switch
              checked={field.value === "true"}
              onCheckedChange={(checked) => onChange(String(checked))}
            />
            <span className="text-sm text-muted-foreground">
              {field.value === "true" ? "Yes" : "No"}
            </span>
          </div>
        )}

        {field.type === "date" && (
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
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        onClick={onRemove}
      >
        <X className="size-4" />
        <span className="sr-only">Remove {field.label}</span>
      </Button>
    </div>
  );
}
