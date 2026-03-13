'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X, MoveHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { assetUrl } from '@/lib/r2-url';
import { FocalPointModal } from '@/components/shared/focal-point-modal';

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
  /** Aspect ratio for the focal point preview (e.g. 3/2, 16/9, 1). */
  aspectRatio?: number;
  /** Called with the selected focal point when a file is chosen or adjusted. */
  onFocalPointChange?: (point: { x: number; y: number }) => void;
  /** Current focal point for existing images (used to pre-position the modal). */
  focalPoint?: { x: number; y: number };
}

/**
 * Image input with drag-and-drop, click-to-upload, and preview.
 * Submits the File directly via FormData for R2 upload.
 * The file input uses the given `name` for form submission.
 *
 * When `onFocalPointChange` is provided a FocalPointModal opens after each
 * file selection so the user can set the crop anchor before the file is
 * committed. An "Adjust Position" overlay button also appears on hover for
 * existing images.
 */
export function ImageInput({
  name,
  value: controlledValue,
  onChange,
  accept = 'image/*',
  maxSizeMB = 50,
  placeholder = 'Drop an image here or click to browse',
  className,
  disabled = false,
  aspectClassName = 'aspect-video',
  aspectRatio,
  onFocalPointChange,
  focalPoint,
}: ImageInputProps) {
  // previewUrl: object URL for newly selected file, or existing R2 URL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [removed, setRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focal point modal state
  const [showFocalPoint, setShowFocalPoint] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingObjectUrl, setPendingObjectUrl] = useState<string | null>(null);

  // Display: new file preview (blob:), or R2 key → full URL from prop
  const displayUrl = previewUrl || (!removed ? assetUrl(controlledValue) : null) || null;

  // Extract filename from existing URL for consistent display
  const urlFileName = controlledValue
    ? decodeURIComponent(controlledValue.split('/').pop() || 'image')
    : null;

  /** Commit a chosen File to the form input and call onChange. */
  const commitFile = useCallback(
    (file: File, objectUrl: string) => {
      setFileInfo({ name: file.name, size: file.size });
      setRemoved(false);
      setPreviewUrl(objectUrl);

      // Set file on the input so FormData includes it
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
      }

      onChange?.(objectUrl);
    },
    [onChange]
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

      const objectUrl = URL.createObjectURL(file);

      if (onFocalPointChange) {
        // Store file and open focal point modal — commit after user chooses
        setPendingFile(file);
        setPendingObjectUrl(objectUrl);
        setShowFocalPoint(true);
      } else {
        // Original behavior: commit immediately
        commitFile(file, objectUrl);
      }
    },
    [maxSizeMB, onFocalPointChange, commitFile]
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
    },
    [processFile]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Revoke object URL to free memory
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setFileInfo(null);
      setRemoved(true);
      setError(null);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onChange?.(null);
    },
    [previewUrl, onChange]
  );

  // ── Focal point modal handlers ─────────────────────────────────────────────

  const handleFocalPointSave = useCallback(
    (point: { x: number; y: number }) => {
      if (pendingFile && pendingObjectUrl) {
        commitFile(pendingFile, pendingObjectUrl);
        onFocalPointChange?.(point);
      }
      setPendingFile(null);
      setPendingObjectUrl(null);
      setShowFocalPoint(false);
    },
    [pendingFile, pendingObjectUrl, commitFile, onFocalPointChange]
  );

  const handleFocalPointSkip = useCallback(() => {
    if (pendingFile && pendingObjectUrl) {
      commitFile(pendingFile, pendingObjectUrl);
      onFocalPointChange?.({ x: 0.5, y: 0.5 });
    }
    setPendingFile(null);
    setPendingObjectUrl(null);
    setShowFocalPoint(false);
  }, [pendingFile, pendingObjectUrl, commitFile, onFocalPointChange]);

  /** Open the focal point modal for an existing (already committed) image. */
  const handleAdjustPosition = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (displayUrl) {
        // For existing images use the resolved URL (blob: or full R2 URL)
        setPendingFile(null);
        setPendingObjectUrl(displayUrl);
        setShowFocalPoint(true);
      }
    },
    [displayUrl]
  );

  /** When adjusting an existing image (no pending file), just update focal point. */
  const handleExistingFocalPointSave = useCallback(
    (point: { x: number; y: number }) => {
      onFocalPointChange?.(point);
      setPendingObjectUrl(null);
      setShowFocalPoint(false);
    },
    [onFocalPointChange]
  );

  const handleExistingFocalPointSkip = useCallback(() => {
    onFocalPointChange?.({ x: 0.5, y: 0.5 });
    setPendingObjectUrl(null);
    setShowFocalPoint(false);
  }, [onFocalPointChange]);

  function formatSize(bytes: number) {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /** Truncate long filenames with ellipsis in the middle, e.g. "abcdef...xyz.jpg" */
  function truncateFilename(name: string, maxLen = 60) {
    if (name.length <= maxLen) return name;
    const ext = name.lastIndexOf('.') !== -1 ? name.slice(name.lastIndexOf('.')) : '';
    const keep = maxLen - ext.length - 3; // 3 for "..."
    const front = Math.ceil(keep / 2);
    const back = Math.floor(keep / 2);
    return name.slice(0, front) + '...' + name.slice(name.length - back - ext.length);
  }

  // Which URL to pass to the focal point modal
  const focalModalUrl = pendingObjectUrl ?? '';
  // Is this the "adjust existing" flow (no pending file to commit)?
  const isAdjustingExisting = showFocalPoint && !pendingFile;

  return (
    <div className={cn('space-y-2', className)}>
      {/* File input for FormData submission */}
      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      {/* Signal server that user explicitly removed the existing image */}
      {removed && !previewUrl && (
        <input type="hidden" name={`${name}_removed`} value="1" />
      )}

      <div className={cn(aspectClassName, 'min-w-0')}>
        {displayUrl ? (
          /* Preview state */
          <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border">
            <div className="group relative min-h-0 flex-1">
              <img
                src={displayUrl}
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
              {onFocalPointChange && aspectRatio && (
                <button
                  type="button"
                  onClick={handleAdjustPosition}
                  disabled={disabled}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80 disabled:opacity-50"
                  aria-label="Adjust image position"
                >
                  <MoveHorizontal className="size-3" />
                  Adjust Position
                </button>
              )}
            </div>
            <div className="shrink-0 truncate border-t bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
              {fileInfo ? (
                <>
                  {truncateFilename(fileInfo.name)}
                  <span className="ml-1.5 text-muted-foreground/60">
                    ({formatSize(fileInfo.size)})
                  </span>
                </>
              ) : (
                urlFileName && truncateFilename(urlFileName)
              )}
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

      {/* Focal point modal — shown after file selection or when adjusting existing */}
      {showFocalPoint && focalModalUrl && aspectRatio && (
        <FocalPointModal
          open={showFocalPoint}
          imageUrl={focalModalUrl}
          aspectRatio={aspectRatio}
          initialFocalPoint={isAdjustingExisting ? (focalPoint ?? { x: 0.5, y: 0.5 }) : { x: 0.5, y: 0.5 }}
          onSave={isAdjustingExisting ? handleExistingFocalPointSave : handleFocalPointSave}
          onSkip={isAdjustingExisting ? handleExistingFocalPointSkip : handleFocalPointSkip}
        />
      )}
    </div>
  );
}
