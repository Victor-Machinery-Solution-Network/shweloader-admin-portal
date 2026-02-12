"use client";

import { useState, useTransition } from "react";
import { GripVertical, Trash2, Eye, EyeOff, Link, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  removeCarouselImage,
  toggleCarouselImageActive,
  updateCarouselImageLink,
} from "@/lib/actions/carousel";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import type { CarouselImageWithDetails } from "@/types/carousel";

interface CarouselImageCardProps {
  image: CarouselImageWithDetails;
}

export function CarouselImageCard({ image }: CarouselImageCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [showLinkEdit, setShowLinkEdit] = useState(false);
  const [linkUrl, setLinkUrl] = useState(image.link_url ?? "");
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isToggling, startToggleTransition] = useTransition();
  const [isLinkSaving, startLinkTransition] = useTransition();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.image_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = image.active === 1;

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await removeCarouselImage(
        image.carousel_id,
        image.image_id,
      );
      if (result.success) {
        toast.success("Image removed");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to remove image");
      }
    });
  }

  function handleToggleActive() {
    startToggleTransition(async () => {
      const result = await toggleCarouselImageActive(
        image.carousel_id,
        image.image_id,
      );
      if (!result.success) {
        toast.error(result.error ?? "Failed to toggle");
      }
    });
  }

  function handleSaveLink() {
    startLinkTransition(async () => {
      const result = await updateCarouselImageLink(
        image.carousel_id,
        image.image_id,
        linkUrl.trim() || null,
      );
      if (result.success) {
        toast.success("Link updated");
        setShowLinkEdit(false);
      } else {
        toast.error(result.error ?? "Failed to update link");
      }
    });
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group relative rounded-lg border bg-card overflow-hidden",
          isDragging && "z-50 shadow-lg ring-2 ring-primary opacity-90",
          !isActive && "opacity-50",
        )}
      >
        {/* Image */}
        <div className="relative aspect-video w-full">
          <img
            src={image.image_url}
            alt=""
            className="size-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Overlay controls */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label="Reorder image"
            className="cursor-grab rounded bg-black/50 p-1 text-white hover:bg-black/70 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>

          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "rounded p-1 text-white",
                      isActive
                        ? "bg-black/50 hover:bg-black/70"
                        : "bg-orange-600/80 hover:bg-orange-600",
                    )}
                    aria-label={isActive ? "Hide image" : "Show image"}
                    onClick={handleToggleActive}
                    disabled={isToggling}
                  >
                    {isActive ? (
                      <Eye aria-hidden="true" className="size-4" />
                    ) : (
                      <EyeOff aria-hidden="true" className="size-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {isActive ? "Hide image" : "Show image"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "rounded p-1 text-white",
                      image.link_url
                        ? "bg-blue-600/80 hover:bg-blue-600"
                        : "bg-black/50 hover:bg-black/70",
                    )}
                    aria-label={image.link_url ? "Edit link" : "Add link"}
                    onClick={() => setShowLinkEdit(!showLinkEdit)}
                  >
                    <Link aria-hidden="true" className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {image.link_url ? "Edit link" : "Add link"}
                </TooltipContent>
              </Tooltip>

              <button
                type="button"
                aria-label="Remove image"
                className="rounded bg-black/50 p-1 text-white hover:bg-red-600"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          </TooltipProvider>
        </div>

        {/* Link indicator */}
        {image.link_url && !showLinkEdit && (
          <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1 text-xs text-white truncate flex items-center gap-1">
            <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{image.link_url}</span>
          </div>
        )}

        {/* Inactive badge */}
        {!isActive && (
          <div className="absolute bottom-0 right-0 m-1.5 rounded bg-orange-600 px-1.5 py-0.5 text-xs font-medium text-white">
            Hidden
          </div>
        )}

        {/* Link edit input */}
        {showLinkEdit && (
          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-2">
            <div className="flex gap-1">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                className="h-7 text-xs bg-white/90 text-black"
                autoFocus
              />
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSaveLink}
                disabled={isLinkSaving}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Remove image?"
        description="This will remove the image from this carousel. The image file will not be deleted."
        isPending={isDeleting}
      />
    </>
  );
}
