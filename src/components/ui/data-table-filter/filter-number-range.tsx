"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

// ── Popover content (reusable with any trigger) ───────────────────────

export function NumberRangeFilterContent({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  value: [number, number] | null;
  onChange: (range: [number, number] | null) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const currentMin = value?.[0] ?? min;
  const currentMax = value?.[1] ?? max;

  const [localMin, setLocalMin] = React.useState(String(currentMin));
  const [localMax, setLocalMax] = React.useState(String(currentMax));

  React.useEffect(() => {
    setLocalMin(String(value?.[0] ?? min));
    setLocalMax(String(value?.[1] ?? max));
  }, [value, min, max]);

  function commitRange(newMin: number, newMax: number) {
    const clampedMin = Math.max(min, Math.min(newMin, max));
    const clampedMax = Math.max(min, Math.min(newMax, max));
    const lo = Math.min(clampedMin, clampedMax);
    const hi = Math.max(clampedMin, clampedMax);
    if (lo <= min && hi >= max) {
      onChange(null);
    } else {
      onChange([lo, hi]);
    }
  }

  function handleSlider(values: number[]) {
    const [lo, hi] = values;
    setLocalMin(String(lo));
    setLocalMax(String(hi));
    commitRange(lo, hi);
  }

  function handleMinBlur() {
    const parsed = parseInt(localMin, 10);
    if (!isNaN(parsed)) commitRange(parsed, currentMax);
    else setLocalMin(String(currentMin));
  }

  function handleMaxBlur() {
    const parsed = parseInt(localMax, 10);
    if (!isNaN(parsed)) commitRange(currentMin, parsed);
    else setLocalMax(String(currentMax));
  }

  function handleKeyDown(e: React.KeyboardEvent, onBlur: () => void) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
      onBlur();
    }
  }

  const fmt = (n: number) => {
    const formatted = n.toLocaleString();
    return unit ? `${formatted} ${unit}` : formatted;
  };

  return (
    <div className="space-y-4">
      <Slider
        value={[currentMin, currentMax]}
        onValueChange={handleSlider}
        min={min}
        max={max}
        step={step}
        className="py-1"
      />
      <div className="flex items-center gap-2">
        <Input
          type="text"
          inputMode="numeric"
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          onBlur={handleMinBlur}
          onKeyDown={(e) => handleKeyDown(e, handleMinBlur)}
          placeholder={fmt(min)}
          className="h-8 text-xs tabular-nums"
        />
        <span className="text-muted-foreground text-xs">–</span>
        <Input
          type="text"
          inputMode="numeric"
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          onBlur={handleMaxBlur}
          onKeyDown={(e) => handleKeyDown(e, handleMaxBlur)}
          placeholder={fmt(max)}
          className="h-8 text-xs tabular-nums"
        />
      </div>
      <div className="text-muted-foreground flex justify-between text-[10px]">
        <span>{fmt(min)}</span>
        <span>{fmt(max)}</span>
      </div>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full text-xs"
          onClick={() => onChange(null)}
        >
          Clear filter
        </Button>
      )}
    </div>
  );
}
