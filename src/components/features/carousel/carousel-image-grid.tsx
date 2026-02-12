"use client";

import { useState, useCallback, useEffect, useTransition, useRef } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { toast } from "sonner";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { CarouselImageCard } from "./carousel-image-card";
import {
  addCarouselImage,
  reorderCarouselImages,
  getCarouselImages,
} from "@/lib/actions/carousel";
import type { CarouselImageWithDetails } from "@/types/carousel";

const MAX_SIZE_MB = 5;

interface CarouselImageGridProps {
  carouselId: number;
  initialImages: CarouselImageWithDetails[];
}

export function CarouselImageGrid({
  carouselId,
  initialImages,
}: CarouselImageGridProps) {
  const [images, setImages] = useState(initialImages);
  const [isAdding, startAddTransition] = useTransition();
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = images.findIndex((img) => img.image_id === active.id);
      const newIndex = images.findIndex((img) => img.image_id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove([...images], oldIndex, newIndex);
      setImages(reordered);

      const orderedIds = reordered.map((img) => img.image_id);
      const result = await reorderCarouselImages(carouselId, orderedIds);
      if (!result.success) {
        toast.error(result.error);
        setImages(images);
      }
    },
    [images, carouselId],
  );

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`Image must be smaller than ${MAX_SIZE_MB}MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        startAddTransition(async () => {
          const result = await addCarouselImage(carouselId, dataUrl);
          if (result.success) {
            toast.success("Image added");
            const updated = await getCarouselImages(carouselId);
            setImages(updated);
          } else {
            toast.error(result.error ?? "Failed to add image");
          }
        });
      };
      reader.readAsDataURL(file);
    },
    [carouselId],
  );

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);
      if (isAdding) return;

      const files = Array.from(e.dataTransfer.files);
      files.forEach(processFile);
    },
    [isAdding, processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      files.forEach(processFile);
      e.target.value = "";
    },
    [processFile],
  );

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image grid with sortable */}
      {images.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((img) => img.image_id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((image) => (
                <CarouselImageCard key={image.image_id} image={image} />
              ))}

              {/* Add more button (inline in grid) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAdding}
                className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:opacity-50"
              >
                <div className="text-center">
                  <ImagePlus className="text-muted-foreground mx-auto size-5" />
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {isAdding ? "Uploading…" : "Add Image"}
                  </span>
                </div>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      ) : null}

      {/* Drop zone / empty state */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isAdding) setIsDraggingFile(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingFile(false);
        }}
        onDrop={handleFileDrop}
        onClick={() => !isAdding && fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          isDraggingFile
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          isAdding && "pointer-events-none opacity-50",
        )}
      >
        <div className="rounded-full bg-muted p-2.5">
          <Upload className="size-5 text-muted-foreground" />
        </div>
        {images.length === 0 ? (
          <>
            <p className="text-sm font-medium">
              {isAdding ? "Uploading…" : "Drop images here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, WebP. Max {MAX_SIZE_MB}MB per image.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {isAdding ? "Uploading…" : "Drop more images here or click to add"}
            </p>
            <p className="text-xs text-muted-foreground">
              {images.length} {images.length === 1 ? "image" : "images"} — drag
              to reorder
            </p>
          </>
        )}
      </div>
    </div>
  );
}
