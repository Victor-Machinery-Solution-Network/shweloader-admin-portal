"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  ImagePlus,
  Move,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { FocalPointModal } from "@/components/shared/focal-point-modal";
import {
  processImageClient,
  buildImageFilenames,
} from "@/lib/api/image-client";
import { uploadToR2Direct } from "@/lib/api/direct-upload";
import { requestUploadSignature } from "@/lib/actions/upload-sign";

export interface GalleryItem {
  id: string;
  /** Existing R2 key — set when editing a saved listing. */
  url?: string;
  /** Pending R2 key for a newly added photo (full-size WebP under `pending/`). */
  pendingKey?: string;
  /** Pending R2 key for the 400 px thumbnail. */
  thumbPendingKey?: string;
  /** BlurHash string computed client-side. */
  blurhash?: string;
  /** Display URL for the card — object: URL while uploading, R2 URL once committed. */
  preview: string;
  focalX?: number;
  focalY?: number;
  /** Set to true while client-side processing or upload is in progress. */
  uploading?: boolean;
  /** Upload progress 0–1, only meaningful while `uploading` is true. */
  progress?: number;
  /** Last error encountered while processing/uploading this item. */
  error?: string;
}

interface SortableImageGalleryProps {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  /** RBAC feature key, e.g. "sale_listings". Used to mint upload tokens. */
  feature: string;
  /** RBAC permission for the parent action — "create" or "edit". */
  permission: "create" | "edit";
  maxImages?: number;
  aspectRatio?: number;
}

const PENDING_PREFIX = "pending/";

// ─── Individual Sortable Image Card ─────────────────────────────────────────

function SortableImageCard({
  id,
  preview,
  focalX,
  focalY,
  uploading,
  progress,
  error,
  onRemove,
  onAdjust,
}: {
  id: string;
  preview: string;
  focalX?: number;
  focalY?: number;
  uploading?: boolean;
  progress?: number;
  error?: string;
  onRemove: () => void;
  onAdjust: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: uploading });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden",
        isDragging && "z-50 shadow-lg ring-2 ring-primary opacity-90",
        error && "ring-2 ring-destructive",
      )}
    >
      <div className="relative aspect-square w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt=""
          className="size-full object-cover"
          style={
            focalX != null && focalY != null
              ? { objectPosition: `${focalX * 100}% ${focalY * 100}%` }
              : undefined
          }
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (
              e.target as HTMLImageElement
            ).nextElementSibling?.classList.remove("hidden");
          }}
        />
        <div className="bg-muted hidden size-full items-center justify-center">
          <ImagePlus className="text-muted-foreground size-6" aria-hidden="true" />
        </div>

        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 text-white">
            <Loader2 className="size-5 animate-spin" />
            {progress != null && (
              <span className="text-[10px] font-medium">
                {Math.round(progress * 100)}%
              </span>
            )}
          </div>
        )}

        {error && !uploading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/80 text-destructive-foreground p-1 text-center"
            title={error}
          >
            <AlertCircle className="size-5" />
            <span className="text-[10px] font-medium">Upload failed</span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="Reorder image"
          className={cn(
            "rounded bg-black/50 p-1 text-white hover:bg-black/70 active:cursor-grabbing",
            uploading ? "cursor-not-allowed opacity-50" : "cursor-grab",
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-1">
          {!uploading && !error && (
            <button
              type="button"
              aria-label="Adjust image position"
              className="rounded bg-black/50 p-1 text-white hover:bg-black/70"
              onClick={onAdjust}
            >
              <Move className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            aria-label="Remove image"
            className="rounded bg-black/50 p-1 text-white hover:bg-red-600"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Gallery Component ─────────────────────────────────────────────────

export function SortableImageGallery({
  items,
  onChange,
  feature,
  permission,
  maxImages,
  aspectRatio = 4 / 3,
}: SortableImageGalleryProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [nextId, setNextId] = useState(() => items.length);
  const [adjustingItem, setAdjustingItem] = useState<string | null>(null);
  const [pendingQueue, setPendingQueue] = useState<string[]>([]);

  // Revoke object URLs on unmount so blob: previews don't leak.
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  /** Patch a single gallery item by id without disturbing the rest. */
  const updateItem = useCallback(
    (id: string, patch: Partial<GalleryItem>) => {
      const current = itemsRef.current;
      const next = current.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      );
      itemsRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  /**
   * Process + direct-upload a newly added image. Runs the same pipeline
   * as ImageInput (decode → resize → WebP encode → blurhash) and uploads
   * full + thumb to `pending/`. Failures land on the item as `error`.
   */
  const processAndUpload = useCallback(
    async (id: string, file: File) => {
      try {
        const processed = await processImageClient(file);
        updateItem(id, { progress: 0 });

        const credentials = await requestUploadSignature(
          feature,
          permission,
          PENDING_PREFIX,
        );
        const { fullFilename, thumbFilename } = buildImageFilenames(file);

        const fullResult = await uploadToR2Direct(
          processed.fullBlob,
          credentials,
          {
            filename: fullFilename,
            onProgress: (loaded, total) =>
              updateItem(id, { progress: loaded / total }),
          },
        );
        const thumbResult = await uploadToR2Direct(
          processed.thumbBlob,
          credentials,
          { filename: thumbFilename },
        );

        updateItem(id, {
          pendingKey: fullResult.key,
          thumbPendingKey: thumbResult.key,
          blurhash: processed.blurhash,
          uploading: false,
          progress: 1,
          error: undefined,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateItem(id, { uploading: false, error: msg });
      }
    },
    [feature, permission, updateItem],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove([...items], oldIndex, newIndex));
      }
    },
    [items, onChange],
  );

  const handleFilesSelected = useCallback(
    (files: FileList) => {
      const remaining =
        maxImages != null ? maxImages - items.length : files.length;
      const newItems: GalleryItem[] = [];
      let id = nextId;

      for (let i = 0; i < Math.min(files.length, remaining); i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        newItems.push({
          id: `img-${id}`,
          preview: URL.createObjectURL(file),
          uploading: true,
          progress: 0,
        });
        id++;
      }

      if (newItems.length > 0) {
        setNextId(id);
        const merged = [...items, ...newItems];
        itemsRef.current = merged;
        onChange(merged);

        // Open focal-point modal for the first new item; queue the rest.
        setAdjustingItem(newItems[0].id);
        if (newItems.length > 1) {
          setPendingQueue(newItems.slice(1).map((item) => item.id));
        }

        // Kick off uploads in parallel; let the browser queue them.
        for (let i = 0; i < newItems.length; i++) {
          void processAndUpload(newItems[i].id, files[i]);
        }
      }
    },
    [items, nextId, maxImages, onChange, processAndUpload],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const item = items[index];
      if (item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange],
  );

  const advanceQueue = useCallback(() => {
    if (pendingQueue.length > 0) {
      setAdjustingItem(pendingQueue[0]);
      setPendingQueue((q) => q.slice(1));
    } else {
      setAdjustingItem(null);
    }
  }, [pendingQueue]);

  const adjustingItemData = adjustingItem
    ? items.find((item) => item.id === adjustingItem) ?? null
    : null;

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((item, index) => (
              <SortableImageCard
                key={item.id}
                id={item.id}
                preview={item.preview}
                focalX={item.focalX}
                focalY={item.focalY}
                uploading={item.uploading}
                progress={item.progress}
                error={item.error}
                onRemove={() => handleRemove(index)}
                onAdjust={() => setAdjustingItem(item.id)}
              />
            ))}

            {(maxImages == null || items.length < maxImages) && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <div className="text-center">
                  <Plus className="text-muted-foreground mx-auto size-5" aria-hidden="true" />
                  <span className="text-muted-foreground mt-1 block text-xs">
                    Add Photo
                  </span>
                </div>
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Drag to reorder. {items.length}
          {maxImages != null ? ` / ${maxImages}` : ""} photos. Max 50MB each.
        </p>
      )}

      {adjustingItemData && (
        <FocalPointModal
          open={adjustingItem !== null}
          imageUrl={adjustingItemData.preview}
          aspectRatio={aspectRatio}
          initialFocalPoint={{
            x: adjustingItemData.focalX ?? 0.5,
            y: adjustingItemData.focalY ?? 0.5,
          }}
          onSave={(point) => {
            onChange(
              items.map((item) =>
                item.id === adjustingItem
                  ? { ...item, focalX: point.x, focalY: point.y }
                  : item,
              ),
            );
            advanceQueue();
          }}
          onSkip={() => advanceQueue()}
        />
      )}
    </div>
  );
}
