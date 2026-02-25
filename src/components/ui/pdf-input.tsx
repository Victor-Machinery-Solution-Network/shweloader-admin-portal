"use client";

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
 * Submits the File directly via FormData for R2 upload.
 * The file input uses the given `name` for form submission.
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
  const [hasNewFile, setHasNewFile] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show preview if we have a new file OR an existing R2 URL (that hasn't been removed)
  const hasValue = hasNewFile || (!!controlledValue && !removed);

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
      setFileSize(file.size);
      setHasNewFile(true);
      setRemoved(false);

      // Set file on the input so FormData includes it
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
      }

      onChange?.(file.name);
    },
    [maxSizeMB, onChange],
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
    },
    [processFile],
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setHasNewFile(false);
      setRemoved(true);
      setFileName(null);
      setFileSize(null);
      setError(null);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onChange?.(null);
    },
    [onChange],
  );

  /** Derive display name from new file, existing URL, or fallback */
  const displayName =
    fileName ??
    (controlledValue
      ? controlledValue.split("/").pop() ?? "Uploaded PDF"
      : "Uploaded PDF");

  const displaySize = fileSize
    ? fileSize < 1024
      ? `${fileSize} B`
      : fileSize < 1024 * 1024
        ? `${(fileSize / 1024).toFixed(1)} KB`
        : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
    : null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* File input for FormData submission */}
      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      {/* Signal explicit removal to the server action */}
      {removed && !hasNewFile && (
        <input type="hidden" name={`${name}_removed`} value="1" />
      )}

      {hasValue ? (
        /* Preview state */
        <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3">
          <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
            <FileText className="size-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              PDF{displaySize ? ` · ${displaySize}` : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleRemove}
            disabled={disabled}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="size-4" />
          </Button>
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
