"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
const PDF_TYPES = new Set(["application/pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ImageDropZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  acceptPdf?: boolean;
  maxFiles?: number;
  label: string;
}

export function ImageDropZone({
  files,
  onChange,
  acceptPdf = false,
  maxFiles = 1,
  label,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = acceptPdf
    ? new Set([...IMAGE_TYPES, ...PDF_TYPES])
    : IMAGE_TYPES;

  const acceptStr = acceptPdf
    ? ".png,.jpg,.jpeg,.gif,.webp,.pdf"
    : ".png,.jpg,.jpeg,.gif,.webp";

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.has(file.type)) {
        return acceptPdf
          ? "Only images or PDFs allowed"
          : "Only images allowed";
      }
      if (file.size > MAX_FILE_SIZE) {
        return "File too large (max 10MB)";
      }
      return null;
    },
    [acceptPdf, acceptedTypes],
  );

  const addFiles = useCallback(
    (newFiles: File[]) => {
      setError(null);
      const validated: File[] = [];

      for (const file of newFiles) {
        const err = validateFile(file);
        if (err) {
          setError(err);
          return;
        }
        validated.push(file);
      }

      const combined = [...files, ...validated].slice(0, maxFiles);
      onChange(combined);
    },
    [files, maxFiles, onChange, validateFile],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (selected) addFiles(Array.from(selected));
    e.target.value = "";
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
    setError(null);
  }

  const isFull = files.length >= maxFiles;

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-xs"
            >
              {PDF_TYPES.has(file.type) ? (
                <FileText className="size-3.5 shrink-0 text-red-500" />
              ) : (
                <ImageIcon className="size-3.5 shrink-0 text-blue-500" />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">
                {file.name}
              </span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {(file.size / 1024).toFixed(0)}KB
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 text-muted-foreground hover:text-destructive"
                onClick={() => removeFile(idx)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {!isFull && (
        <div
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 transition-all",
            isDragging
              ? "scale-[1.02] border-primary bg-primary/5"
              : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30",
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="size-3.5 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            {acceptPdf ? "Drop image or PDF" : "Drop image here"}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        multiple={maxFiles > 1}
        className="hidden"
        onChange={handleInputChange}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
