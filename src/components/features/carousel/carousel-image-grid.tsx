"use client";

import { useCallback, useState, useTransition } from "react";
import { assetUrl } from "@/lib/r2-url";
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
import { useHasPermission } from "@/hooks/use-permissions";
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
import { FocalPointModal } from "@/components/shared/focal-point-modal";
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
  const canCreate = useHasPermission("carousels", "create");
  const { data: images, setData: setImages, handleReorder } = useDragReorder(
    initialImages,
    {
      getRowId: (img) => img.image_id,
      tableName: "carousel_image",
      feature: "carousels",
      scopeId: carouselId,
    },
  );

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [hasFile, setHasFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdding, startAddTransition] = useTransition();
  const [newFocalPoint, setNewFocalPoint] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [focalPointImage, setFocalPointImage] = useState<{
    imageId: number;
    imageUrl: string;
    focalX: number;
    focalY: number;
  } | null>(null);

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
    setHasFile(false);
    setLinkUrl("");
    setNewFocalPoint({ x: 0.5, y: 0.5 });
    setShowAddDialog(true);
  }

  function handleAddImage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startAddTransition(async () => {
      const { addCarouselImage } = await import("@/lib/actions/carousel");
      const result = await addCarouselImage(carouselId, formData);

      if (result.success) {
        toast.success("Image added");
        setShowAddDialog(false);
      } else {
        toast.error(result.error ?? "Failed to add image");
      }
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
                    onAdjustPosition={() =>
                      setFocalPointImage({
                        imageId: image.image_id,
                        imageUrl: image.image_url,
                        focalX: image.focal_x ?? 0.5,
                        focalY: image.focal_y ?? 0.5,
                      })
                    }
                  />
                ))}

                {/* Add image placeholder card */}
                {canCreate && (
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
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Footer stats + action */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Drag to reorder &middot; {activeCount} active
              {hiddenCount > 0 && `, ${hiddenCount} hidden`}
            </span>
            {canCreate && (
              <Button variant="outline" size="sm" onClick={openAddDialog}>
                <Plus /> Add Image
              </Button>
            )}
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
          {canCreate && (
            <Button size="sm" onClick={openAddDialog}>
              <Plus /> Add Image
            </Button>
          )}
        </div>
      )}

      {/* ── Focal Point Modal ────────────────────────────────────── */}
      <FocalPointModal
        open={focalPointImage !== null}
        imageUrl={assetUrl(focalPointImage?.imageUrl ?? "") ?? ""}
        aspectRatio={16 / 9}
        initialFocalPoint={
          focalPointImage
            ? { x: focalPointImage.focalX, y: focalPointImage.focalY }
            : undefined
        }
        onSave={async (point) => {
          if (!focalPointImage) return;
          const { updateImageFocalPoint } = await import("@/lib/actions/carousel");
          const result = await updateImageFocalPoint(focalPointImage.imageId, point.x, point.y);
          if (result.success) {
            setFocalPointImage(null);
          } else {
            toast.error(result.error ?? "Failed to save focal point");
          }
        }}
        onSkip={() => setFocalPointImage(null)}
      />

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
              onChange={(val) => setHasFile(!!val)}
              accept="image/jpeg,image/png,image/webp"
              placeholder="Drag & drop an image here, or click to browse"
              disabled={isAdding}
              aspectRatio={16 / 9}
              onFocalPointChange={setNewFocalPoint}
              focalPoint={newFocalPoint}
              feature="carousels"
              permission="create"
              onUploadingChange={setIsUploading}
            />
            <input type="hidden" name="focal_x" value={newFocalPoint.x} />
            <input type="hidden" name="focal_y" value={newFocalPoint.y} />

            <Field orientation="vertical">
              <FieldLabel>
                Link URL{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <FieldContent>
                <Input
                  name="link_url"
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
                disabled={!hasFile || isAdding || isUploading}
              >
                {isUploading ? "Uploading\u2026" : isAdding ? "Saving\u2026" : "Add Image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
