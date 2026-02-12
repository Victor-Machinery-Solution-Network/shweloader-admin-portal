"use client";

import { useState, useTransition } from "react";
import {
  Images,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { CarouselForm } from "./carousel-form";
import { CarouselImageGrid } from "./carousel-image-grid";
import { deleteCarousel } from "@/lib/actions/carousel";
import type { Carousel, CarouselImageWithDetails } from "@/types/carousel";

interface CarouselData {
  carousel: Carousel;
  images: CarouselImageWithDetails[];
}

interface CarouselClientProps {
  carousels: CarouselData[];
}

export function CarouselClient({ carousels }: CarouselClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingCarousel, setEditingCarousel] = useState<Carousel | undefined>();
  const [deletingCarousel, setDeletingCarousel] = useState<Carousel | undefined>();
  const [isDeleting, startDeleteTransition] = useTransition();

  const defaultTab =
    carousels.length > 0 ? String(carousels[0].carousel.carousel_id) : "";

  function handleDelete() {
    if (!deletingCarousel) return;
    startDeleteTransition(async () => {
      const result = await deleteCarousel(deletingCarousel.carousel_id);
      if (result.success) {
        toast.success("Carousel deleted");
        setDeletingCarousel(undefined);
      } else {
        toast.error(result.error ?? "Failed to delete carousel");
      }
    });
  }

  return (
    <>
      <PageHeader
        title="Carousel Images"
        description="Manage carousel slideshows for the website"
      >
        <Button onClick={() => setShowCreate(true)}>
          <Plus /> Add Carousel
        </Button>
      </PageHeader>

      {carousels.length > 0 ? (
        <Tabs defaultValue={defaultTab}>
          <div className="flex items-center gap-2">
            <TabsList>
              {carousels.map(({ carousel, images }) => (
                <TabsTrigger
                  key={carousel.carousel_id}
                  value={String(carousel.carousel_id)}
                >
                  {carousel.name}
                  <Badge
                    variant="outline"
                    className="ml-1.5 size-5 justify-center p-0"
                  >
                    {images.length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {carousels.map(({ carousel, images }) => (
            <TabsContent
              key={carousel.carousel_id}
              value={String(carousel.carousel_id)}
            >
              {/* Carousel info header */}
              <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                <div>
                  <h3 className="font-medium">{carousel.name}</h3>
                  {carousel.description && (
                    <p className="text-muted-foreground text-sm">
                      {carousel.description}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs">
                      <MoreHorizontal />
                      <span className="sr-only">Carousel options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => setEditingCarousel(carousel)}
                    >
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeletingCarousel(carousel)}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CarouselImageGrid
                carouselId={carousel.carousel_id}
                initialImages={images}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <EmptyState
          icon={Images}
          title="No carousels yet"
          description="Get started by creating your first carousel."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Add Carousel
            </Button>
          }
        />
      )}

      {/* Create carousel dialog */}
      <CarouselForm open={showCreate} onOpenChange={setShowCreate} />

      {/* Edit carousel dialog */}
      <CarouselForm
        open={!!editingCarousel}
        onOpenChange={(open) => {
          if (!open) setEditingCarousel(undefined);
        }}
        carousel={editingCarousel}
      />

      {/* Delete carousel dialog */}
      <DeleteDialog
        open={!!deletingCarousel}
        onOpenChange={(open) => {
          if (!open) setDeletingCarousel(undefined);
        }}
        onConfirm={handleDelete}
        title="Delete carousel?"
        description={
          deletingCarousel
            ? `This will permanently delete "${deletingCarousel.name}" and remove all its images. This action cannot be undone.`
            : ""
        }
        isPending={isDeleting}
      />
    </>
  );
}
