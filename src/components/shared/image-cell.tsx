"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { assetUrl } from "@/lib/r2-url";

interface ImageCellProps {
  name: string;
  imageUrl: string | null;
  focalX?: number | null;
  focalY?: number | null;
}

export function ImageCell({ name, imageUrl, focalX, focalY }: ImageCellProps) {
  const [showPreview, setShowPreview] = useState(false);
  const initial = name.charAt(0).toUpperCase();
  const src = assetUrl(imageUrl);

  return (
    <div className="flex items-center gap-3">
      {src ? (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="size-11 shrink-0 overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img
            src={src}
            alt={name}
            className="size-full object-cover"
            style={focalX != null && focalY != null ? { objectPosition: `${focalX * 100}% ${focalY * 100}%` } : undefined}
          />
        </button>
      ) : (
        <div className="size-11 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
          <span className="text-sm font-medium text-muted-foreground">
            {initial}
          </span>
        </div>
      )}

      <span className="font-medium">{name}</span>

      {showPreview && src && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
              <DialogDescription>Image preview</DialogDescription>
            </DialogHeader>
            <div className="overflow-hidden rounded-lg border bg-muted">
              <img
                src={src}
                alt={name}
                className="w-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
