"use client";

import { useState, useTransition } from "react";
import { assetUrl } from "@/lib/r2-url";
import {
  GripVertical,
  Trash2,
  Eye,
  EyeOff,
  Link,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useHasPermission } from "@/hooks/use-permissions";
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
  index: number;
}

export function CarouselImageCard({ image, index }: CarouselImageCardProps) {
  const canEdit = useHasPermission("carousels", "edit");
  const canDelete = useHasPermission("carousels", "delete");
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
          "group relative overflow-hidden rounded-lg border bg-card transition-shadow",
          isDragging && "z-50 shadow-lg ring-2 ring-primary",
          !isActive && "opacity-60",
        )}
      >
        {/* Image area */}
        <div className="relative aspect-video w-full">
          <img
            src={assetUrl(image.image_url) ?? ""}
            alt=""
            className="size-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />

          {/* Order badge — always visible */}
          <span className="absolute left-1.5 top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-semibold text-white backdrop-blur-sm">
            {index}
          </span>

          {/* Hover overlay controls */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Drag handle — offset below order badge */}
            <button
              type="button"
              aria-label="Reorder image"
              className="mt-6 cursor-grab rounded bg-black/50 p-1 text-white backdrop-blur-sm hover:bg-black/70 active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical aria-hidden="true" className="size-4" />
            </button>

            <TooltipProvider>
              <div className="flex items-center gap-1">
                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "rounded p-1 text-white backdrop-blur-sm",
                          isActive
                            ? "bg-black/50 hover:bg-black/70"
                            : "bg-amber-600/80 hover:bg-amber-600",
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
                )}

                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "rounded p-1 text-white backdrop-blur-sm",
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
                )}

                {canDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Remove image"
                        className="rounded bg-black/50 p-1 text-white backdrop-blur-sm hover:bg-red-600"
                        onClick={() => setShowDelete(true)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Remove image</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </div>

          {/* Inline link edit */}
          {showLinkEdit && (
            <div className="absolute inset-x-0 bottom-0 bg-black/80 p-2 backdrop-blur-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveLink();
                }}
                className="flex gap-1"
              >
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://\u2026"
                  className="h-7 bg-white/90 text-xs text-black"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isLinkSaving}
                >
                  Save
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Status footer — always visible */}
        <div className="flex items-center gap-1.5 border-t px-2 py-1.5">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
          />
          <span className="text-[11px] text-muted-foreground">
            {isActive ? "Active" : "Hidden"}
          </span>
          {image.link_url && !showLinkEdit && (
            <>
              <span className="text-muted-foreground/50">&middot;</span>
              <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
              <span className="max-w-[120px] truncate text-[11px] text-muted-foreground">
                {image.link_url}
              </span>
            </>
          )}
        </div>
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
