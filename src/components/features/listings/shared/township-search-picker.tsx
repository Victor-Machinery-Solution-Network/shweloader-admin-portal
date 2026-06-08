"use client";

import { useMemo, useState } from "react";
import { MapPin, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import type { StateRegion, District, Township } from "@/types/location";

export interface TownshipOption {
  townshipId: string;
  districtId: string;
  stateRegionId: string;
  primary: string; // township name (English)
  secondary: string; // "District · State" (English)
  primaryMy: string; // township name_my (falls back to English)
  secondaryMy: string; // "District_my · State_my" (falls back to English)
  searchHay: string; // lowercased "EN parts MY parts" for token matching
}

interface TownshipSearchPickerProps {
  stateRegions: StateRegion[];
  districts: District[];
  townships: Township[];
  /** Selected township_id as a string, or "" when none is chosen. */
  value: string;
  /** Called with the picked option, or null when the selection is cleared. */
  onSelect: (opt: TownshipOption | null) => void;
  disabled?: boolean;
  error?: boolean;
}

// Burmese Unicode block — used for script detection on the search query.
const MY_SCRIPT = /[က-႟]/;

export function TownshipSearchPicker({
  stateRegions,
  districts,
  townships,
  value,
  onSelect,
  disabled,
  error,
}: TownshipSearchPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo<TownshipOption[]>(() => {
    const stateById = new Map(stateRegions.map((s) => [s.state_region_id, s]));
    const districtById = new Map(districts.map((d) => [d.district_id, d]));
    return townships.map((t) => {
      const d = districtById.get(t.district_id);
      const s = d ? stateById.get(d.state_region_id) : undefined;
      const dName = d?.name ?? "";
      const sName = s?.name ?? "";
      const dNameMy = d?.name_my ?? dName;
      const sNameMy = s?.name_my ?? sName;
      const tNameMy = t.name_my ?? t.name;
      return {
        townshipId: String(t.township_id),
        districtId: d ? String(d.district_id) : "",
        stateRegionId: s ? String(s.state_region_id) : "",
        primary: t.name,
        secondary: `${dName} · ${sName}`,
        primaryMy: tNameMy,
        secondaryMy: `${dNameMy} · ${sNameMy}`,
        searchHay: `${t.name} ${dName} ${sName} ${tNameMy} ${dNameMy} ${sNameMy}`
          .normalize("NFC")
          .toLowerCase(),
      };
    });
  }, [stateRegions, districts, townships]);

  const selected = useMemo(
    () => options.find((o) => o.townshipId === value) ?? null,
    [options, value],
  );

  const useMy = MY_SCRIPT.test(query);

  const filtered = useMemo(() => {
    const tokens = query
      .normalize("NFC")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length === 0) return options;
    return options.filter((o) =>
      tokens.every((tok) => o.searchHay.includes(tok)),
    );
  }, [options, query]);

  return (
    <>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent py-1 pl-3 text-sm shadow-xs transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            selected ? "pr-9" : "pr-3",
            error && "border-destructive ring-[3px] ring-destructive/20",
          )}
        >
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "flex-1 truncate text-left",
              !selected && "text-muted-foreground",
            )}
          >
            {selected
              ? `${selected.primary}, ${selected.secondary}`
              : "Select location"}
          </span>
          {!selected && (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>
        {selected && (
          <button
            type="button"
            aria-label="Clear location"
            disabled={disabled}
            onClick={() => onSelect(null)}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuery("");
        }}
        title="Select township"
        description="Search by township, district, or state — English or Burmese"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search township…"
          />
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            {filtered.map((o) => {
              const isActive = o.townshipId === value;
              return (
                <CommandItem
                  key={o.townshipId}
                  value={o.townshipId}
                  data-checked={isActive ? "true" : undefined}
                  onSelect={() => {
                    onSelect(o);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">
                      {useMy ? o.primaryMy : o.primary}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {useMy ? o.secondaryMy : o.secondary}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
