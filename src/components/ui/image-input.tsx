'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, X, MoveHorizontal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { assetUrl } from '@/lib/r2-url';
import { FocalPointModal } from '@/components/shared/focal-point-modal';
import {
  processImageClient,
  buildImageFilenames,
} from '@/lib/api/image-client';
import { uploadToR2Direct } from '@/lib/api/direct-upload';
import { requestUploadSignature } from '@/lib/actions/upload-sign';

interface FileInfo {
  name: string;
  size: number;
}

interface UploadedKeys {
  fullKey: string;
  thumbKey: string;
  blurhash: string;
}

interface ImageInputProps {
  name: string;
  value?: string | null;
  onChange?: (value: string | null) => void;
  /** RBAC feature key, e.g. "articles". */
  feature: string;
  /** RBAC permission — "create" for new entities, "edit" when the form is an edit. */
  permission: 'create' | 'edit';
  /** Called while a file is being processed or uploaded so the parent can disable Submit. */
  onUploadingChange?: (uploading: boolean) => void;
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

const PENDING_PREFIX = 'pending/';

/**
 * Image input with drag-and-drop, click-to-upload, focal-point modal, and
 * direct-to-R2 upload via the Approach 2 commit-on-save flow.
 *
 * Pipeline on file select:
 *   validate → focal point modal (if `onFocalPointChange` is set) → resize +
 *   WebP encode + blurhash via @jsquash WASM → direct-upload full + thumb
 *   to `pending/...` → set `_pending_key`, `_thumb_pending_key`, `_blurhash`
 *   hidden fields. The server's processImageFieldRich commits both keys
 *   to the final R2 prefix when the form is submitted.
 */
export function ImageInput({
  name,
  value: controlledValue,
  onChange,
  feature,
  permission,
  onUploadingChange,
  accept = 'image/png,image/jpeg,image/gif,image/webp',
  maxSizeMB = 50,
  placeholder = 'Drop an image here or click to browse',
  className,
  disabled = false,
  aspectClassName = 'aspect-video',
  aspectRatio,
  onFocalPointChange,
  focalPoint,
}: ImageInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [removed, setRemoved] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedKeys | null>(null);

  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showFocalPoint, setShowFocalPoint] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingObjectUrl, setPendingObjectUrl] = useState<string | null>(null);

  const busy = processing || uploading;
  useEffect(() => {
    onUploadingChange?.(busy);
  }, [busy, onUploadingChange]);

  // Display: new file preview (blob:), or R2 key → full URL from prop
  const displayUrl =
    previewUrl || (!removed ? assetUrl(controlledValue) : null) || null;

  const urlFileName = controlledValue
    ? decodeURIComponent(controlledValue.split('/').pop() || 'image')
    : null;

  /**
   * Process the selected image (decode → resize → WebP encode → blurhash)
   * and direct-upload the full + thumb to `pending/`. Aborts cleanly if
   * the user cancels or replaces the file mid-flight.
   */
  const processAndUpload = useCallback(
    async (file: File, objectUrl: string) => {
      setError(null);
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setFileInfo({ name: file.name, size: file.size });
      setRemoved(false);
      setPreviewUrl(objectUrl);
      setProcessing(true);
      setProgress(0);

      try {
        const processed = await processImageClient(file);
        if (ctrl.signal.aborted) return;
        setProcessing(false);

        setUploading(true);
        const credentials = await requestUploadSignature(
          feature,
          permission,
          PENDING_PREFIX,
        );
        if (ctrl.signal.aborted) return;

        const { fullFilename, thumbFilename } = buildImageFilenames(file);

        // Upload full first (largest), report progress on it. Thumb is
        // tiny so its progress doesn't really matter — fire it after.
        const fullResult = await uploadToR2Direct(processed.fullBlob, credentials, {
          filename: fullFilename,
          signal: ctrl.signal,
          onProgress: (loaded, total) => setProgress(loaded / total),
        });
        const thumbResult = await uploadToR2Direct(processed.thumbBlob, credentials, {
          filename: thumbFilename,
          signal: ctrl.signal,
        });

        setUploaded({
          fullKey: fullResult.key,
          thumbKey: thumbResult.key,
          blurhash: processed.blurhash,
        });
        setProgress(1);
        onChange?.(fullResult.key);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        if (msg !== 'Upload cancelled') setError(msg);
        setUploaded(null);
        setFileInfo(null);
        setPreviewUrl(null);
      } finally {
        setProcessing(false);
        setUploading(false);
      }
    },
    [feature, permission, onChange],
  );

  const validateAndStart = useCallback(
    (file: File) => {
      setError(null);

      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Image must be smaller than ${maxSizeMB}MB`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const objectUrl = URL.createObjectURL(file);

      if (onFocalPointChange) {
        // Show focal point modal first; upload triggers when user confirms.
        setPendingFile(file);
        setPendingObjectUrl(objectUrl);
        setShowFocalPoint(true);
      } else {
        void processAndUpload(file, objectUrl);
      }
    },
    [maxSizeMB, onFocalPointChange, processAndUpload],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !busy) setIsDragging(true);
    },
    [disabled, busy],
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
      if (disabled || busy) return;
      const file = e.dataTransfer.files[0];
      if (file) validateAndStart(file);
    },
    [disabled, busy, validateAndStart],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndStart(file);
    },
    [validateAndStart],
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      abortRef.current?.abort();
      abortRef.current = null;
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setFileInfo(null);
      setRemoved(true);
      setError(null);
      setUploaded(null);
      setProcessing(false);
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onChange?.(null);
    },
    [previewUrl, onChange],
  );

  // ── Focal point modal handlers ─────────────────────────────────────────────

  const handleFocalPointSave = useCallback(
    (point: { x: number; y: number }) => {
      if (pendingFile && pendingObjectUrl) {
        onFocalPointChange?.(point);
        void processAndUpload(pendingFile, pendingObjectUrl);
      }
      setPendingFile(null);
      setPendingObjectUrl(null);
      setShowFocalPoint(false);
    },
    [pendingFile, pendingObjectUrl, processAndUpload, onFocalPointChange],
  );

  const handleFocalPointSkip = useCallback(() => {
    if (pendingObjectUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingObjectUrl);
    }
    setPendingFile(null);
    setPendingObjectUrl(null);
    setShowFocalPoint(false);
  }, [pendingObjectUrl]);

  /** Re-open modal for an existing committed image — focal point only, no re-upload. */
  const handleAdjustPosition = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (displayUrl) {
        setPendingFile(null);
        setPendingObjectUrl(displayUrl);
        setShowFocalPoint(true);
      }
    },
    [displayUrl],
  );

  const handleExistingFocalPointSave = useCallback(
    (point: { x: number; y: number }) => {
      onFocalPointChange?.(point);
      setPendingObjectUrl(null);
      setShowFocalPoint(false);
    },
    [onFocalPointChange],
  );

  const handleExistingFocalPointSkip = useCallback(() => {
    setPendingObjectUrl(null);
    setShowFocalPoint(false);
  }, []);

  function formatSize(bytes: number) {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function truncateFilename(filename: string, maxLen = 60) {
    if (filename.length <= maxLen) return filename;
    const ext =
      filename.lastIndexOf('.') !== -1
        ? filename.slice(filename.lastIndexOf('.'))
        : '';
    const keep = maxLen - ext.length - 3;
    const front = Math.ceil(keep / 2);
    const back = Math.floor(keep / 2);
    return (
      filename.slice(0, front) + '...' + filename.slice(filename.length - back - ext.length)
    );
  }

  const focalModalUrl = pendingObjectUrl ?? '';
  const isAdjustingExisting = showFocalPoint && !pendingFile;

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || busy}
      />

      {/* Hidden fields the server's processImageFieldRich reads. */}
      {uploaded && (
        <>
          <input
            type="hidden"
            name={`${name}_pending_key`}
            value={uploaded.fullKey}
          />
          <input
            type="hidden"
            name={`${name}_thumb_pending_key`}
            value={uploaded.thumbKey}
          />
          <input
            type="hidden"
            name={`${name}_blurhash`}
            value={uploaded.blurhash}
          />
        </>
      )}
      {removed && !uploaded && (
        <input type="hidden" name={`${name}_removed`} value="1" />
      )}

      <div className={cn(aspectClassName, 'min-w-0')}>
        {displayUrl ? (
          <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border">
            <div className="group relative min-h-0 flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt="Selected image preview"
                className="size-full object-cover"
                style={
                  focalPoint
                    ? {
                        objectPosition: `${focalPoint.x * 100}% ${focalPoint.y * 100}%`,
                      }
                    : undefined
                }
              />
              {busy && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white backdrop-blur-sm">
                  <Loader2 className="size-6 animate-spin" />
                  <p className="text-xs font-medium">
                    {processing
                      ? 'Processing image…'
                      : `Uploading… ${Math.round(progress * 100)}%`}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white backdrop-blur-sm transition-colors hover:bg-black/80 disabled:opacity-50"
                aria-label={busy ? 'Cancel upload' : 'Remove image'}
              >
                <X className="size-4" />
              </button>
              {onFocalPointChange && aspectRatio && !busy && (
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
          <div
            onClick={() => !disabled && !busy && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex h-full cursor-pointer flex-col items-center justify-center gap-2 border border-dashed rounded-lg text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
              (disabled || busy) && 'cursor-not-allowed opacity-50',
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

      {showFocalPoint && focalModalUrl && aspectRatio && (
        <FocalPointModal
          open={showFocalPoint}
          imageUrl={focalModalUrl}
          aspectRatio={aspectRatio}
          initialFocalPoint={
            isAdjustingExisting ? (focalPoint ?? { x: 0.5, y: 0.5 }) : { x: 0.5, y: 0.5 }
          }
          onSave={
            isAdjustingExisting ? handleExistingFocalPointSave : handleFocalPointSave
          }
          onSkip={
            isAdjustingExisting ? handleExistingFocalPointSkip : handleFocalPointSkip
          }
        />
      )}
    </div>
  );
}
