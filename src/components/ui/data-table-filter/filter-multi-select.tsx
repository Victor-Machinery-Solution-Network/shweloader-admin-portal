"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

// ── Popover content (reusable with any trigger) ───────────────────────

export function FacetedFilterContent({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const selectedSet = new Set(selected);

  function toggle(value: string) {
    const next = new Set(selectedSet);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(Array.from(next));
  }

  return (
    <Command>
      <CommandInput placeholder={label} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {options.map((option) => {
            const isSelected = selectedSet.has(option.value);
            return (
              <CommandItem
                key={option.value}
                onSelect={() => toggle(option.value)}
              >
                <div
                  className={cn(
                    "border-primary flex size-4 shrink-0 items-center justify-center rounded-sm border",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible",
                  )}
                >
                  <Check className="size-3" />
                </div>
                <span className="flex-1 truncate">{option.label}</span>
                {option.count != null && (
                  <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                    {option.count}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {selectedSet.size > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => onChange([])}
                className="justify-center text-center"
              >
                Clear filter
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}
