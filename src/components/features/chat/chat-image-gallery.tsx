"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { assetUrl } from "@/lib/r2-url";
import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/types/chat";

const MAX_VISIBLE = 4;

interface ChatImageGalleryProps {
  attachments: ChatAttachment[];
}

export function ChatImageGallery({ attachments }: ChatImageGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const visible = attachments.slice(0, MAX_VISIBLE);
  const extraCount = attachments.length - MAX_VISIBLE;
  const count = visible.length;

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const goPrev = useCallback(
    () => setViewerIndex((i) => (i > 0 ? i - 1 : attachments.length - 1)),
    [attachments.length],
  );
  const goNext = useCallback(
    () => setViewerIndex((i) => (i < attachments.length - 1 ? i + 1 : 0)),
    [attachments.length],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!viewerOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeViewer();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewerOpen, closeViewer, goPrev, goNext]);

  return (
    <>
      <div
        className={cn(
          "grid gap-px overflow-hidden bg-border w-full",
          count === 1 && "grid-cols-1",
          count === 2 && "grid-cols-2",
          count === 3 && "grid-cols-2",
          count >= 4 && "grid-cols-2",
        )}
      >
        {visible.map((att, index) => {
          const isLastWithExtra = index === MAX_VISIBLE - 1 && extraCount > 0;
          // For 3 images: first image spans full width
          const spanFull = count === 3 && index === 0;

          return (
            <button
              key={att.id}
              type="button"
              onClick={() => openViewer(index)}
              className={cn(
                "relative overflow-hidden cursor-pointer focus:outline-none group",
                spanFull && "col-span-2",
                count === 1 ? "aspect-4/3" : "aspect-square",
              )}
            >
              <Image
                src={assetUrl(att.file_url) ?? ""}
                alt={att.file_name}
                fill
                className={cn(
                  "object-cover transition-opacity group-hover:opacity-90",
                )}
                sizes="(max-width: 640px) 50vw, 300px"
              />
              {isLastWithExtra && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="text-white text-xl font-semibold">
                    +{extraCount}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Lightbox modal */}
      {viewerOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={closeViewer}
        >
          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium">
            {viewerIndex + 1} / {attachments.length}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={closeViewer}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-6" />
          </button>

          {/* Prev button */}
          {attachments.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-8" />
            </button>
          )}

          {/* Image */}
          <Image
            src={assetUrl(attachments[viewerIndex].file_url) ?? ""}
            alt={attachments[viewerIndex].file_name}
            width={0}
            height={0}
            sizes="85vw"
            className="max-h-[85vh] max-w-[85vw] w-auto h-auto object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {attachments.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronRight className="size-8" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
