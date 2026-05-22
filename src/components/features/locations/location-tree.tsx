"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  Search,
  ListFilter,
  X,
  ChevronsDownUp,
  ChevronsUpDown,
  Map,
  Landmark,
  Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FacetedFilterContent } from "@/components/ui/data-table-filter/filter-multi-select";
import { cn } from "@/lib/utils";
import type {
  StateRegion,
  DistrictWithParent,
  TownshipWithParents,
} from "@/types/location";

interface LocationTreeProps {
  stateRegions: StateRegion[];
  districtsWithParents: DistrictWithParent[];
  townships: TownshipWithParents[];
}

interface TreeDistrict {
  district: DistrictWithParent;
  townships: TownshipWithParents[];
}

interface TreeStateRegion {
  stateRegion: StateRegion;
  districts: TreeDistrict[];
  totalTownships: number;
}

const TYPE_LABELS: Record<string, string> = {
  state: "State",
  region: "Region",
  union_territory: "Union Territory",
};

const TYPE_OPTIONS = [
  { label: "State", value: "state" },
  { label: "Region", value: "region" },
  { label: "Union Territory", value: "union_territory" },
];

export function LocationTree({
  stateRegions,
  districtsWithParents,
  townships,
}: LocationTreeProps) {
  const [search, setSearch] = useState("");
  const [expandedSR, setExpandedSR] = useState<Set<number>>(new Set());
  const [expandedD, setExpandedD] = useState<Set<number>>(new Set());

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [srFilter, setSrFilter] = useState<string[]>([]);

  const srOptions = useMemo(
    () => stateRegions.map((sr) => ({ label: sr.name, value: sr.name })),
    [stateRegions],
  );

  const activeFilterCount =
    (typeFilter.length > 0 ? 1 : 0) + (srFilter.length > 0 ? 1 : 0);

  // Build tree structure
  const tree = useMemo<TreeStateRegion[]>(() => {
    return stateRegions.map((sr) => {
      const srDistricts = districtsWithParents
        .filter((d) => d.state_region_id === sr.state_region_id)
        .map((d) => ({
          district: d,
          townships: townships.filter((t) => t.district_id === d.district_id),
        }));
      return {
        stateRegion: sr,
        districts: srDistricts,
        totalTownships: srDistricts.reduce(
          (sum, d) => sum + d.townships.length,
          0,
        ),
      };
    });
  }, [stateRegions, districtsWithParents, townships]);

  // Apply filters + search
  const isSearching = search.trim().length > 0;
  const hasFilters = activeFilterCount > 0;
  const hasActiveFiltering = isSearching || hasFilters;

  const filteredTree = useMemo(() => {
    let result = tree;

    // Apply type filter
    if (typeFilter.length > 0) {
      result = result.filter((n) => typeFilter.includes(n.stateRegion.type));
    }

    // Apply state/region name filter
    if (srFilter.length > 0) {
      result = result.filter((n) => srFilter.includes(n.stateRegion.name));
    }

    // Apply text search
    if (isSearching) {
      const q = search.toLowerCase().trim();
      result = result
        .map((node) => {
          const srMatch = node.stateRegion.name.toLowerCase().includes(q);
          if (srMatch) return node;

          const filteredDistricts = node.districts
            .map((dNode) => {
              const dMatch = dNode.district.name.toLowerCase().includes(q);
              if (dMatch) return dNode;

              const filteredTownships = dNode.townships.filter((t) =>
                t.name.toLowerCase().includes(q),
              );
              if (filteredTownships.length > 0) {
                return { ...dNode, townships: filteredTownships };
              }
              return null;
            })
            .filter((d): d is TreeDistrict => d !== null);

          if (filteredDistricts.length > 0) {
            return {
              ...node,
              districts: filteredDistricts,
              totalTownships: filteredDistricts.reduce(
                (sum, d) => sum + d.townships.length,
                0,
              ),
            };
          }
          return null;
        })
        .filter((n): n is TreeStateRegion => n !== null);
    }

    return result;
  }, [tree, search, isSearching, typeFilter, srFilter]);

  // Auto-expand all nodes when searching or filtering
  const activeSR = hasActiveFiltering
    ? new Set(filteredTree.map((n) => n.stateRegion.state_region_id))
    : expandedSR;
  const activeD = hasActiveFiltering
    ? new Set(
        filteredTree.flatMap((n) =>
          n.districts.map((d) => d.district.district_id),
        ),
      )
    : expandedD;

  function toggleSR(id: number) {
    if (hasActiveFiltering) return;
    setExpandedSR((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleD(id: number) {
    if (hasActiveFiltering) return;
    setExpandedD((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isAllExpanded =
    expandedSR.size === stateRegions.length &&
    expandedD.size === districtsWithParents.length;

  function toggleExpandAll() {
    if (isAllExpanded) {
      setExpandedSR(new Set());
      setExpandedD(new Set());
    } else {
      setExpandedSR(new Set(stateRegions.map((sr) => sr.state_region_id)));
      setExpandedD(new Set(districtsWithParents.map((d) => d.district_id)));
    }
  }

  function clearAllFilters() {
    setTypeFilter([]);
    setSrFilter([]);
  }

  return (
    <div className="space-y-3">
      {/* Header: search + filter + expand/collapse */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search all locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 border-dashed">
              <ListFilter className="size-4" />
              Filter
              {activeFilterCount > 0 && (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {activeFilterCount}
                  </Badge>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <div className="border-b px-3 py-2 text-sm font-medium">Type</div>
            <FacetedFilterContent
              label="Type"
              options={TYPE_OPTIONS}
              selected={typeFilter}
              onChange={setTypeFilter}
            />
            <div className="border-b border-t px-3 py-2 text-sm font-medium">
              State/Region
            </div>
            <FacetedFilterContent
              label="State/Region"
              options={srOptions}
              selected={srFilter}
              onChange={setSrFilter}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={toggleExpandAll}
          disabled={hasActiveFiltering}
        >
          {isAllExpanded ? (
            <><ChevronsDownUp className="size-3.5" /> Collapse All</>
          ) : (
            <><ChevronsUpDown className="size-3.5" /> Expand All</>
          )}
        </Button>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {typeFilter.length > 0 && (
            <div className="bg-background flex items-center rounded-lg border text-xs">
              <span className="py-1 pl-2 pr-1.5">
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium">
                  {typeFilter.length === 1
                    ? TYPE_LABELS[typeFilter[0]] ?? typeFilter[0]
                    : `${typeFilter.length} selected`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setTypeFilter([])}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center rounded-r-lg border-l py-1 pl-1 pr-1.5 transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          {srFilter.length > 0 && (
            <div className="bg-background flex items-center rounded-lg border text-xs">
              <span className="py-1 pl-2 pr-1.5">
                <span className="text-muted-foreground">State/Region: </span>
                <span className="font-medium">
                  {srFilter.length === 1
                    ? srFilter[0]
                    : `${srFilter.length} selected`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSrFilter([])}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center rounded-r-lg border-l py-1 pl-1 pr-1.5 transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          {activeFilterCount > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 px-2 text-xs"
            >
              Clear all
              <X className="ml-1 size-3" />
            </Button>
          )}
        </div>
      )}

      {/* Summary stats */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Map className="size-3.5 text-blue-500" /> {filteredTree.length} states/regions
        </span>
        <span>&middot;</span>
        <span className="flex items-center gap-1.5">
          <Landmark className="size-3.5 text-teal-500" />{" "}
          {filteredTree.reduce((s, n) => s + n.districts.length, 0)} districts
        </span>
        <span>&middot;</span>
        <span className="flex items-center gap-1.5">
          <Building2 className="size-3.5 text-indigo-500" />{" "}
          {filteredTree.reduce((s, n) => s + n.totalTownships, 0)} townships
        </span>
      </div>

      {/* Tree */}
      {filteredTree.length > 0 ? (
        <div className="space-y-2">
          {filteredTree.map((node) => {
            const srId = node.stateRegion.state_region_id;
            const isSRExpanded = activeSR.has(srId);

            return (
              <div key={srId} className="rounded-lg border bg-card">
                {/* ── State/Region row ── */}
                <button
                  type="button"
                  onClick={() => toggleSR(srId)}
                  className={cn(
                    "flex w-full items-center gap-2.5 p-3 text-left transition-colors",
                    isSRExpanded
                      ? "rounded-t-lg"
                      : "rounded-lg hover:bg-muted/50",
                    isSRExpanded && "bg-muted/40 hover:bg-muted/60",
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isSRExpanded && "rotate-90",
                    )}
                  />
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                    <Map className="size-3.5 text-blue-500" />
                  </div>
                  <span className="font-semibold">
                    {node.stateRegion.name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {TYPE_LABELS[node.stateRegion.type] ??
                      node.stateRegion.type}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {node.districts.length}{" "}
                    {node.districts.length === 1 ? "district" : "districts"}{" "}
                    &middot; {node.totalTownships}{" "}
                    {node.totalTownships === 1 ? "township" : "townships"}
                  </span>
                </button>

                {/* ── Districts under this state/region ── */}
                {isSRExpanded && (
                  <div className="border-t">
                    {node.districts.length > 0 ? (
                      node.districts.map((dNode) => {
                        const dId = dNode.district.district_id;
                        const isDExpanded = activeD.has(dId);

                        return (
                          <div key={dId}>
                            {/* ── District row ── */}
                            <button
                              type="button"
                              onClick={() => toggleD(dId)}
                              className={cn(
                                "flex w-full items-center gap-2 pl-9 pr-3 py-2.5 text-left transition-colors hover:bg-muted/30",
                                isDExpanded && "bg-muted/20",
                              )}
                            >
                              <ChevronRight
                                className={cn(
                                  "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                                  isDExpanded && "rotate-90",
                                )}
                              />
                              <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-teal-500/10">
                                <Landmark className="size-3 text-teal-500" />
                              </div>
                              <span className="text-sm font-medium">
                                {dNode.district.name}
                              </span>
                              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                {dNode.townships.length}{" "}
                                {dNode.townships.length === 1
                                  ? "township"
                                  : "townships"}
                              </span>
                            </button>

                            {/* ── Townships under this district ── */}
                            {isDExpanded && (
                              <div className="bg-muted/10 py-1">
                                {dNode.townships.length > 0 ? (
                                  dNode.townships.map((t) => (
                                    <div
                                      key={t.township_id}
                                      className="flex items-center gap-2 py-1.5 pl-16 text-sm text-muted-foreground"
                                    >
                                      <div className="flex size-5 shrink-0 items-center justify-center rounded bg-indigo-500/10">
                                        <Building2 className="size-2.5 text-indigo-500" />
                                      </div>
                                      {t.name}
                                    </div>
                                  ))
                                ) : (
                                  <div className="py-2 pl-16 text-xs text-muted-foreground/60 italic">
                                    No townships
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-3 pl-9 text-xs text-muted-foreground/60 italic">
                        No districts
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {hasActiveFiltering
              ? "No locations match your filters"
              : "No locations yet"}
          </p>
          {hasActiveFiltering && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setSearch("");
                clearAllFilters();
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
