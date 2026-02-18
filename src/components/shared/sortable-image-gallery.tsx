"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical, ImagePlus, Link } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SortableImageGalleryProps {
  images: string[];
  onChange: (images: string[]) => void;
  /** Pass `undefined` or omit for unlimited. */
  maxImages?: number;
}

// ─── Individual Sortable Image Card ─────────────────────────────────────────

function SortableImageCard({
  id,
  url,
  onRemove,
  onUrlChange,
}: {
  id: string;
  url: string;
  onRemove: () => void;
  onUrlChange: (url: string) => void;
}) {
  const [showUrlInput, setShowUrlInput] = useState(!url);
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
      {/* Image preview or URL input */}
      {url && !showUrlInput ? (
        <div className="relative aspect-square w-full">
          <img
            src={url}
            alt=""
            className="size-full object-cover"
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
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-muted/50 p-2">
          <div className="w-full space-y-2 text-center">
            <ImagePlus className="text-muted-foreground mx-auto size-6" aria-hidden="true" />
            <Input
              placeholder="Paste image URL\u2026"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onBlur={() => {
                if (url) setShowUrlInput(false);
              }}
              className="h-7 text-xs"
              autoFocus
            />
          </div>
        </div>
      )}

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
        <button
          type="button"
          aria-label="Remove image"
          className="rounded bg-black/50 p-1 text-white hover:bg-red-600"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Edit URL button (when showing image) */}
      {url && !showUrlInput && (
        <div className="absolute inset-x-0 bottom-0 p-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 rounded bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
            onClick={() => setShowUrlInput(true)}
          >
            <Link className="size-3" aria-hidden="true" /> Edit URL
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Gallery Component ─────────────────────────────────────────────────

export function SortableImageGallery({
  images,
  onChange,
  maxImages,
}: SortableImageGalleryProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Each image needs a stable ID for DnD
  const [nextId, setNextId] = useState(() => images.length);
  const [ids, setIds] = useState<string[]>(() =>
    images.map((_, i) => `img-${i}`),
  );

  // Keep IDs in sync with images array length
  const currentIds = (() => {
    if (ids.length >= images.length) return ids.slice(0, images.length);
    // Need to grow — handled via event handlers, but safety fallback
    const extra = Array.from(
      { length: images.length - ids.length },
      (_, i) => `img-${nextId + i}`,
    );
    return [...ids, ...extra];
  })();

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = currentIds.indexOf(active.id as string);
      const newIndex = currentIds.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newImages = arrayMove([...images], oldIndex, newIndex);
        const newIds = arrayMove([...currentIds], oldIndex, newIndex);
        setIds(newIds);
        onChange(newImages);
      }
    },
    [images, currentIds, onChange],
  );

  const handleAdd = useCallback(() => {
    setIds((prev) => [...prev, `img-${nextId}`]);
    setNextId((n) => n + 1);
    onChange([...images, ""]);
  }, [images, nextId, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      setIds((prev) => prev.filter((_, i) => i !== index));
      onChange(images.filter((_, i) => i !== index));
    },
    [images, onChange],
  );

  const handleUrlChange = useCallback(
    (index: number, url: string) => {
      const updated = [...images];
      updated[index] = url;
      onChange(updated);
    },
    [images, onChange],
  );

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={currentIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {currentIds.map((id, index) => (
              <SortableImageCard
                key={id}
                id={id}
                url={images[index]}
                onRemove={() => handleRemove(index)}
                onUrlChange={(url) => handleUrlChange(index, url)}
              />
            ))}

            {/* Add button */}
            {(maxImages == null || images.length < maxImages) && (
              <button
                type="button"
                onClick={handleAdd}
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

      {images.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Drag to reorder. {images.length}{maxImages != null ? ` / ${maxImages}` : ""} photos.
        </p>
      )}
    </div>
  );
}
