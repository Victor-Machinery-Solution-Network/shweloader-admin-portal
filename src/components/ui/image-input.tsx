'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileInfo {
  name: string;
  size: number;
}

interface ImageInputProps {
  name: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
  accept?: string;
  maxSizeMB?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** CSS class for the aspect ratio container. Defaults to "aspect-video". */
  aspectClassName?: string;
}

/**
 * Image input with drag-and-drop, click-to-upload, and preview.
 * Stores the image as a base64 data URL string (temporary until R2 is set up).
 * The value is submitted via a hidden input with the given `name`.
 */
export function ImageInput({
  name,
  value: controlledValue,
  onChange,
  accept = 'image/*',
  maxSizeMB = 5,
  placeholder = 'Drop an image here or click to browse',
  className,
  disabled = false,
  aspectClassName = 'aspect-video',
}: ImageInputProps) {
  const [internalValue, setInternalValue] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const setValue = useCallback(
    (newValue: string | null) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [controlledValue, onChange]
  );

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Image must be smaller than ${maxSizeMB}MB`);
        return;
      }

      setFileInfo({ name: file.name, size: file.size });

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setValue(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [maxSizeMB, setValue]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
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
    [disabled, processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [processFile]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setValue(null);
      setFileInfo(null);
      setError(null);
    },
    [setValue]
  );

  function formatSize(bytes: number) {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value ?? ''} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <div className={aspectClassName}>
        {value ? (
          /* Preview state */
          <div className="flex h-full flex-col overflow-hidden rounded-lg border">
            <div className="relative min-h-0 flex-1">
              <img
                src={value}
                alt="Selected image preview"
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white backdrop-blur-sm transition-colors hover:bg-black/80 disabled:opacity-50"
                aria-label="Remove image"
              >
                <X className="size-4" />
              </button>
            </div>
            {fileInfo && (
              <div className="shrink-0 border-t bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                {fileInfo.name}
                <span className="ml-1.5 text-muted-foreground/60">
                  ({formatSize(fileInfo.size)})
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Upload zone */
          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex h-full cursor-pointer flex-col items-center justify-center gap-2 border border-dashed rounded-lg text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <div className="rounded-full bg-muted p-2.5">
              <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">{placeholder}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Max {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
