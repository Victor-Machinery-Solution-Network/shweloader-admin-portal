"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Plus, Trash2, GripVertical, ImagePlus, Move } from "lucide-react";
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

export interface GalleryItem {
  id: string;
  url?: string;    // existing R2 URL (edit mode)
  file?: File;     // new file to upload
  preview: string; // display source (R2 URL or object URL)
  focalX?: number;
  focalY?: number;
}

interface SortableImageGalleryProps {
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
  maxImages?: number;
  aspectRatio?: number;
}

// ─── Individual Sortable Image Card ─────────────────────────────────────────

function SortableImageCard({
  id,
  preview,
  focalX,
  focalY,
  onRemove,
  onAdjust,
}: {
  id: string;
  preview: string;
  focalX?: number;
  focalY?: number;
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
  } = useSortable({ id });

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
      )}
    >
      <div className="relative aspect-square w-full">
        <img
          src={preview}
          alt=""
          className="size-full object-cover"
          style={focalX != null && focalY != null ? { objectPosition: `${focalX * 100}% ${focalY * 100}%` } : undefined}
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
      </div>

      {/* Overlay controls */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="Reorder image"
          className="cursor-grab rounded bg-black/50 p-1 text-white hover:bg-black/70 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Adjust image position"
            className="rounded bg-black/50 p-1 text-white hover:bg-black/70"
            onClick={onAdjust}
          >
            <Move className="size-3.5" aria-hidden="true" />
          </button>
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

  // Revoke all file-based object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.file) URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

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
          file,
          preview: URL.createObjectURL(file),
        });
        id++;
      }

      if (newItems.length > 0) {
        setNextId(id);
        onChange([...items, ...newItems]);
        // Queue all newly added images for focal point adjustment
        setAdjustingItem(newItems[0].id);
        if (newItems.length > 1) {
          setPendingQueue(newItems.slice(1).map((item) => item.id));
        }
      }
    },
    [items, nextId, maxImages, onChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const item = items[index];
      if (item.file) URL.revokeObjectURL(item.preview);
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
                onRemove={() => handleRemove(index)}
                onAdjust={() => setAdjustingItem(item.id)}
              />
            ))}

            {/* Add button */}
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
          {maxImages != null ? ` / ${maxImages}` : ""} photos. Max 10MB each.
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
