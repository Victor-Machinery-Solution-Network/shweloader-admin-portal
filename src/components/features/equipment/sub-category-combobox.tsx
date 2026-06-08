"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import type {
  EquipmentMainCategory,
  EquipmentSubCategory,
} from "@/types/equipment";

interface SubCategoryComboboxProps {
  value: string;
  onValueChange: (value: string | null) => void;
  subCategories: EquipmentSubCategory[];
  mainCategories: EquipmentMainCategory[];
  /** Sub-category names allowed by the current brand filter (pass every name when unfiltered). */
  allowedNames: string[];
}

/**
 * Equipment sub-category picker shared by the equipment Model form and the
 * listing "Find Model" dialog. A flat list (so the combobox's built-in query
 * filter works) ordered so same-main-category items sit together, each row
 * showing the sub-category name with its main category as muted text underneath.
 */
export function SubCategoryCombobox({
  value,
  onValueChange,
  subCategories,
  mainCategories,
  allowedNames,
}: SubCategoryComboboxProps) {
  // Map each sub-category name to its main category label.
  const subCategoryGroupLabel = useMemo(() => {
    const mainCatIdToName = new Map(
      mainCategories.map((mc) => [mc.category_id, mc.name]),
    );
    const map = new Map<string, string>();
    for (const sc of subCategories) {
      map.set(sc.name, mainCatIdToName.get(sc.category_id) ?? "Other");
    }
    return map;
  }, [subCategories, mainCategories]);

  // Flat names, ordered so same-main-category items are adjacent, restricted to
  // the allowed (brand-filtered) set.
  const orderedSubCategoryNames = useMemo(() => {
    const allowed = new Set(allowedNames);
    const groups = new Map<string, string[]>();
    for (const sc of subCategories) {
      if (!allowed.has(sc.name)) continue;
      const groupName = subCategoryGroupLabel.get(sc.name) ?? "Other";
      if (!groups.has(groupName)) groups.set(groupName, []);
      groups.get(groupName)!.push(sc.name);
    }
    const result: string[] = [];
    for (const items of groups.values()) result.push(...items);
    return result;
  }, [allowedNames, subCategories, subCategoryGroupLabel]);

  return (
    <Combobox value={value} onValueChange={onValueChange} items={orderedSubCategoryNames}>
      <ComboboxInput placeholder="Search sub category…" showClear={!!value} />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxEmpty>No sub category found</ComboboxEmpty>
          <ComboboxCollection>
            {(name) => (
              <ComboboxItem key={name} value={name}>
                <span className="flex flex-col">
                  <span>{name}</span>
                  <span className="text-muted-foreground text-xs">
                    {subCategoryGroupLabel.get(name)}
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
