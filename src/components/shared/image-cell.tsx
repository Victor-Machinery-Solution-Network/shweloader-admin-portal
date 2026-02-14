"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ImageCellProps {
  name: string;
  imageUrl: string | null;
}

export function ImageCell({ name, imageUrl }: ImageCellProps) {
  const [showPreview, setShowPreview] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {imageUrl ? (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="size-11 shrink-0 overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img
            src={imageUrl}
            alt={name}
            className="size-full object-cover"
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

      {showPreview && imageUrl && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{name}</DialogTitle>
              <DialogDescription>Image preview</DialogDescription>
            </DialogHeader>
            <div className="overflow-hidden rounded-lg border bg-muted">
              <img
                src={imageUrl}
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
