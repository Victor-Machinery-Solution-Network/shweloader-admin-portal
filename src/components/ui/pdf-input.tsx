"use client";

import * as React from "react";
import { useCallback, useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PdfInputProps {
  name: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
  maxSizeMB?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * PDF input with drag-and-drop, click-to-upload, and filename preview.
 * Stores the PDF as a base64 data URL string (temporary until R2 is set up).
 * The value is submitted via a hidden input with the given `name`.
 */
export function PdfInput({
  name,
  value: controlledValue,
  onChange,
  maxSizeMB = 10,
  placeholder = "Drag & drop a PDF here, or click to browse",
  className,
  disabled = false,
}: PdfInputProps) {
  const [internalValue, setInternalValue] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const value =
    controlledValue !== undefined ? controlledValue : internalValue;

  const setValue = useCallback(
    (newValue: string | null) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [controlledValue, onChange],
  );

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (file.type !== "application/pdf") {
        setError("Please select a PDF file");
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`PDF must be smaller than ${maxSizeMB}MB`);
        return;
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setValue(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [maxSizeMB, setValue],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [disabled, processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setValue(null);
      setFileName(null);
      setError(null);
    },
    [setValue],
  );

  /** Derive a display name from the data URL or stored filename */
  const displayName =
    fileName ?? (value ? "Uploaded PDF" : null);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value ?? ""} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {value ? (
        /* Preview state */
        <div className="relative group">
          <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3">
            <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
              <FileText className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">PDF Document</p>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X />
            </Button>
          </div>
        </div>
      ) : (
        /* Upload zone */
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <div className="rounded-full bg-muted p-2">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{placeholder}</p>
          <p className="text-xs text-muted-foreground/60">
            PDF only, max {maxSizeMB}MB
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
