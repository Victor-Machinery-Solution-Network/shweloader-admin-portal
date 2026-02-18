"use client";

import { useCallback, useState, useTransition } from "react";
import { ImagePlus, Plus, Image as ImageIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldContent, FieldDescription } from "@/components/ui/field";
import { ImageInput } from "@/components/ui/image-input";
import { CarouselImageCard } from "./carousel-image-card";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import type { CarouselImageWithDetails } from "@/types/carousel";

interface CarouselImageGridProps {
  carouselId: number;
  carouselName: string;
  initialImages: CarouselImageWithDetails[];
}

export function CarouselImageGrid({
  carouselId,
  carouselName,
  initialImages,
}: CarouselImageGridProps) {
  const { data: images, setData: setImages, handleReorder } = useDragReorder(
    initialImages,
    {
      getRowId: (img) => img.image_id,
      tableName: "carousel_image",
      scopeId: carouselId,
    },
  );

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [imageValue, setImageValue] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [isAdding, startAddTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = images.findIndex((img) => img.image_id === active.id);
      const newIndex = images.findIndex((img) => img.image_id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove([...images], oldIndex, newIndex);
      handleReorder(reordered, { activeId: active.id, newIndex });
    },
    [images, handleReorder],
  );

  function openAddDialog() {
    setImageValue(null);
    setLinkUrl("");
    setShowAddDialog(true);
  }

  function handleAddImage(e: React.FormEvent) {
    e.preventDefault();
    if (!imageValue) return;

    // TODO: Implement actual file upload to storage service
    // For now, placeholder — will be wired to upload endpoint later
    startAddTransition(async () => {
      toast.info("Image upload not yet implemented — coming soon!");
      setShowAddDialog(false);
    });
  }

  const activeCount = images.filter((img) => img.active === 1).length;
  const hiddenCount = images.length - activeCount;

  return (
    <>
      {images.length > 0 ? (
        <div className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((img) => img.image_id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((image, index) => (
                  <CarouselImageCard
                    key={image.image_id}
                    image={image}
                    index={index + 1}
                  />
                ))}

                {/* Add image placeholder card */}
                <button
                  type="button"
                  onClick={openAddDialog}
                  className="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  <div className="text-center">
                    <ImagePlus className="mx-auto size-5 text-muted-foreground" />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Add Image
                    </span>
                  </div>
                </button>
              </div>
            </SortableContext>
          </DndContext>

          {/* Footer stats + action */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Drag to reorder &middot; {activeCount} active
              {hiddenCount > 0 && `, ${hiddenCount} hidden`}
            </span>
            <Button variant="outline" size="sm" onClick={openAddDialog}>
              <Plus /> Add Image
            </Button>
          </div>
        </div>
      ) : (
        /* Empty state for this carousel */
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <ImageIcon className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No images yet</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Add your first image to the &ldquo;{carouselName}&rdquo; carousel
          </p>
          <Button variant="outline" size="sm" onClick={openAddDialog}>
            <Plus /> Add Image
          </Button>
        </div>
      )}

      {/* ── Add Image Dialog ─────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
            <DialogDescription>
              Upload an image to the &ldquo;{carouselName}&rdquo; carousel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddImage} className="space-y-4">
            <ImageInput
              name="image"
              value={imageValue}
              onChange={setImageValue}
              accept="image/jpeg,image/png,image/webp"
              maxSizeMB={5}
              placeholder="Drag & drop an image here, or click to browse"
              disabled={isAdding}
            />

            <Field orientation="vertical">
              <FieldLabel>
                Link URL{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/promo"
                  autoComplete="off"
                />
                <FieldDescription>
                  Where users navigate when they click this carousel image
                </FieldDescription>
              </FieldContent>
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!imageValue || isAdding}
              >
                {isAdding ? "Uploading\u2026" : "Add Image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
