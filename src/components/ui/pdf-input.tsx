"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  buildUploadFilename,
  uploadToR2Direct,
} from "@/lib/api/direct-upload";
import { requestUploadSignature } from "@/lib/actions/upload-sign";

interface PdfInputProps {
  name: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
  /** RBAC feature key, e.g. "equipment_models". */
  feature: string;
  /** RBAC permission — "create" for new entities, "edit" when the form is an edit. */
  permission: "create" | "edit";
  /** Called while an upload is in-flight so the parent can disable Submit. */
  onUploadingChange?: (uploading: boolean) => void;
  maxSizeMB?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/** Staging prefix every PDF lands in before the admin clicks Save. */
const PENDING_PREFIX = "pending/";

/**
 * PDF input with drag-and-drop, click-to-upload, and direct-to-R2 upload.
 * The file never goes through Vercel — on selection it's uploaded to R2
 * under `pending/…` via a signed token. The server action commits the
 * upload to its final prefix (via processFileField) after Save is clicked.
 * Abandoned uploads auto-expire via the R2 lifecycle rule on `pending/`.
 */
export function PdfInput({
  name,
  value: controlledValue,
  onChange,
  feature,
  permission,
  onUploadingChange,
  maxSizeMB = 50,
  placeholder = "Drag & drop a PDF here, or click to browse",
  className,
  disabled = false,
}: PdfInputProps) {
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const hasValue =
    uploadedKey !== null || (!!controlledValue && !removed) || uploading;

  const doUpload = useCallback(
    async (file: File) => {
      setError(null);
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setUploading(true);
      setProgress(0);
      setFileName(file.name);
      setFileSize(file.size);
      setRemoved(false);

      try {
        const credentials = await requestUploadSignature(
          feature,
          permission,
          PENDING_PREFIX,
        );
        const result = await uploadToR2Direct(file, credentials, {
          filename: buildUploadFilename(file),
          signal: ctrl.signal,
          onProgress: (loaded, total) => setProgress(loaded / total),
        });
        setUploadedKey(result.key);
        setProgress(1);
        onChange?.(result.key);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        // Ignore user-initiated cancellations — we already cleared state
        if (msg !== "Upload cancelled") setError(msg);
        setUploadedKey(null);
        setFileName(null);
        setFileSize(null);
      } finally {
        setUploading(false);
      }
    },
    [feature, permission, onChange],
  );

  const validateAndUpload = useCallback(
    (file: File) => {
      setError(null);

      if (file.type !== "application/pdf") {
        setError("Please select a PDF file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`PDF must be smaller than ${maxSizeMB}MB`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      void doUpload(file);
    },
    [maxSizeMB, doUpload],
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
      if (disabled || uploading) return;
      const file = e.dataTransfer.files[0];
      if (file) validateAndUpload(file);
    },
    [disabled, uploading, validateAndUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndUpload(file);
    },
    [validateAndUpload],
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      abortRef.current?.abort();
      abortRef.current = null;
      setUploadedKey(null);
      setRemoved(true);
      setFileName(null);
      setFileSize(null);
      setError(null);
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onChange?.(null);
    },
    [onChange],
  );

  const displayName =
    fileName ??
    (controlledValue
      ? (controlledValue.split("/").pop() ?? "Uploaded PDF")
      : "Uploaded PDF");

  const displaySize =
    fileSize !== null
      ? fileSize < 1024
        ? `${fileSize} B`
        : fileSize < 1024 * 1024
          ? `${(fileSize / 1024).toFixed(1)} KB`
          : `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
      : null;

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Hidden fields the server action reads */}
      {uploadedKey && (
        <input type="hidden" name={`${name}_pending_key`} value={uploadedKey} />
      )}
      {removed && !uploadedKey && (
        <input type="hidden" name={`${name}_removed`} value="1" />
      )}

      {hasValue ? (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3">
          <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
            {uploading ? (
              <Loader2 className="size-5 animate-spin text-red-600 dark:text-red-400" />
            ) : (
              <FileText className="size-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">
              {uploading
                ? `Uploading… ${Math.round(progress * 100)}%`
                : `PDF${displaySize ? ` · ${displaySize}` : ""}`}
            </p>
            {uploading && (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width] duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleRemove}
            disabled={disabled}
            className="text-muted-foreground hover:text-destructive shrink-0"
            aria-label={uploading ? "Cancel upload" : "Remove PDF"}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() =>
            !disabled && !uploading && fileInputRef.current?.click()
          }
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
