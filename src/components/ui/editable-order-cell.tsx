"use client";

import { useState, useRef, useEffect } from "react";

interface EditableOrderCellProps {
  position: number;
  totalItems: number;
  onMove: (targetPosition: number) => void;
  disabled?: boolean;
}

export function EditableOrderCell({
  position,
  totalItems,
  onMove,
  disabled,
}: EditableOrderCellProps) {
  "use no memo"; // Receives props from TanStack Table's mutable cell context
  // Guard: ensure position is always a valid number (belt-and-suspenders for stale compiler cache)
  const safePosition = Number.isFinite(position) ? position : 1;
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(safePosition));
  const inputRef = useRef<HTMLInputElement>(null);
  // Guard against Escape → blur race: blur fires before React re-renders,
  // so commit() would run with the user's typed value instead of being cancelled.
  const cancelledRef = useRef(false);

  // Sync display value when position changes externally (after reorder)
  useEffect(() => {
    if (!isEditing) setValue(String(safePosition));
  }, [safePosition, isEditing]);

  // Auto-focus and select on edit
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function handleClick(e: React.MouseEvent) {
    if (disabled) return;
    e.stopPropagation(); // Prevent row selection
    setIsEditing(true);
    setValue(String(safePosition));
  }

  function commit() {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    setIsEditing(false);
    const trimmed = value.trim();
    if (!trimmed) return; // Empty input = cancel
    const parsed = Math.floor(Number(trimmed));
    if (isNaN(parsed) || parsed <= 0) return;
    const clamped = Math.min(parsed, totalItems);
    if (clamped === safePosition) return; // No-op
    onMove(clamped);
  }

  function cancel() {
    cancelledRef.current = true;
    setIsEditing(false);
    setValue(String(safePosition));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={1}
        max={totalItems}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="text-foreground block w-full min-w-[3rem] rounded-full bg-transparent px-4 py-1.5 text-center text-sm font-medium tabular-nums ring-2 ring-amber-400 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Move to position"
      />
    );
  }

  if (disabled) {
    return (
      <span className="text-muted-foreground/70 block min-w-[3rem] text-center text-sm font-medium tabular-nums">
        {safePosition}
      </span>
    );
  }

  return (
    <span
      onClick={handleClick}
      className="text-foreground/60 hover:text-foreground hover:border-foreground/30 block min-w-[3rem] cursor-pointer rounded-full border border-border px-4 py-1.5 text-center text-sm font-medium tabular-nums transition-colors"
      role="button"
      aria-label={`Edit position ${safePosition}`}
    >
      {safePosition}
    </span>
  );
}
