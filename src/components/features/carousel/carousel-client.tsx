"use client";

import { Images } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { CarouselImageGrid } from "./carousel-image-grid";
import type { Carousel, CarouselImageWithDetails } from "@/types/carousel";

interface CarouselData {
  carousel: Carousel;
  images: CarouselImageWithDetails[];
}

interface CarouselClientProps {
  carousels: CarouselData[];
}

export function CarouselClient({ carousels }: CarouselClientProps) {
  if (carousels.length === 0) {
    return (
      <EmptyState
        icon={Images}
        title="No carousels configured"
        description="Carousels are pre-configured in the database. Contact a developer to add new carousel slots."
      />
    );
  }

  return (
    <div className="space-y-8">
      {carousels.map(({ carousel, images }) => (
        <section
          key={carousel.carousel_id}
          className="overflow-hidden rounded-xl border bg-card"
        >
          {/* Section header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                <Images className={cn("size-4 text-blue-500")} />
              </div>
              <div>
                <h2 className="text-base font-semibold">{carousel.name}</h2>
                {carousel.description && (
                  <p className="text-xs text-muted-foreground">
                    {carousel.description}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="secondary">
              {images.length} {images.length === 1 ? "image" : "images"}
            </Badge>
          </div>

          {/* Image grid */}
          <div className="p-5">
            <CarouselImageGrid
              carouselId={carousel.carousel_id}
              carouselName={carousel.name}
              initialImages={images}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
