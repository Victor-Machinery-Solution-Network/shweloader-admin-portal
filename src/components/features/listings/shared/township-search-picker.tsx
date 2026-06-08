"use client";

import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
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

  const getOptionLabel = (opt: TownshipOption) =>
    `${opt.primary}, ${opt.secondary}`;

  const filterOption = (opt: TownshipOption, inputValue: string) => {
    const tokens = inputValue
      .normalize("NFC")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length === 0) return true;
    return tokens.every((tok) => opt.searchHay.includes(tok));
  };

  const handleComboboxValueChange = (opt: TownshipOption | null) => {
    if (!opt) {
      onSelect(null);
      setQuery("");
      return;
    }

    onSelect(opt);
    setQuery("");
  };

  return (
    <Combobox
      value={selected}
      onValueChange={handleComboboxValueChange}
      items={options}
      itemToStringLabel={getOptionLabel}
      itemToStringValue={(opt) => opt.townshipId}
      isItemEqualToValue={(a, b) => a.townshipId === b.townshipId}
      filter={filterOption}
      onInputValueChange={setQuery}
    >
      <ComboboxInput
        placeholder="Select location"
        showClear={!!selected}
        disabled={disabled}
        aria-invalid={error}
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxEmpty>No township found</ComboboxEmpty>
          <ComboboxCollection>
            {(o: TownshipOption) => (
              <ComboboxItem key={o.townshipId} value={o}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {useMy ? o.primaryMy : o.primary}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {useMy ? o.secondaryMy : o.secondary}
                  </span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxCollection>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
