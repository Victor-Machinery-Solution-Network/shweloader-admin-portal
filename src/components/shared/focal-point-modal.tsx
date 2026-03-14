"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FocalPoint {
  x: number;
  y: number;
}

interface FocalPointModalProps {
  open: boolean;
  imageUrl: string;
  aspectRatio: number;
  initialFocalPoint?: FocalPoint;
  onSave: (point: FocalPoint) => void;
  onSkip: () => void;
}

// Minimum scale factor beyond cover-fit to ensure there's always room to drag
const MIN_OVERFLOW_RATIO = 1.3;

export function FocalPointModal({
  open,
  imageUrl,
  aspectRatio,
  initialFocalPoint = { x: 0.5, y: 0.5 },
  onSave,
  onSkip,
}: FocalPointModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasInitialized = useRef(false);

  const initializePosition = useCallback(() => {
    if (hasInitialized.current) return;
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.naturalWidth) return;

    const containerWidth = container.clientWidth;
    if (containerWidth === 0) return;
    const containerHeight = containerWidth / aspectRatio;

    // Scale image to cover the container
    const scaleX = containerWidth / img.naturalWidth;
    const scaleY = containerHeight / img.naturalHeight;
    const coverScale = Math.max(scaleX, scaleY);

    // Ensure minimum overflow so there's always meaningful drag room
    const coverWidth = img.naturalWidth * coverScale;
    const coverHeight = img.naturalHeight * coverScale;
    const overflowX = coverWidth / containerWidth;
    const overflowY = coverHeight / containerHeight;
    const maxOverflow = Math.max(overflowX, overflowY);

    // If the image barely overflows, scale it up to guarantee drag room
    let scale = coverScale;
    if (maxOverflow < MIN_OVERFLOW_RATIO) {
      scale = coverScale * (MIN_OVERFLOW_RATIO / maxOverflow);
    }

    const scaledWidth = img.naturalWidth * scale;
    const scaledHeight = img.naturalHeight * scale;

    setImageSize({ width: scaledWidth, height: scaledHeight });
    setContainerSize({ width: containerWidth, height: containerHeight });

    const maxOffsetX = scaledWidth - containerWidth;
    const maxOffsetY = scaledHeight - containerHeight;
    setPosition({
      x: -(initialFocalPoint.x * maxOffsetX),
      y: -(initialFocalPoint.y * maxOffsetY),
    });
    hasInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectRatio, initialFocalPoint.x, initialFocalPoint.y]);

  useEffect(() => {
    if (open) {
      hasInitialized.current = false;
      const timer = setTimeout(initializePosition, 100);
      return () => clearTimeout(timer);
    }
  }, [open, initializePosition]);

  // Window-level mouse tracking for reliable drag behavior
  useEffect(() => {
    if (!isDragging) return;

    const maxOffsetX = imageSize.width - containerSize.width;
    const maxOffsetY = imageSize.height - containerSize.height;

    // Lock to the axis with more overflow (like LinkedIn for wide banners)
    const lockAxis =
      maxOffsetX > 5 && maxOffsetY > 5
        ? null // both directions have room — free drag
        : maxOffsetX > maxOffsetY
          ? "x"
          : "y";

    const onMouseMove = (e: MouseEvent) => {
      const dx = lockAxis === "y" ? 0 : e.clientX - dragStart.current.x;
      const dy = lockAxis === "x" ? 0 : e.clientY - dragStart.current.y;
      setPosition({
        x: Math.min(0, Math.max(-maxOffsetX, dragStart.current.posX + dx)),
        y: Math.min(0, Math.max(-maxOffsetY, dragStart.current.posY + dy)),
      });
    };

    const onMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, imageSize, containerSize]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position]
  );

  const getFocalPoint = useCallback((): FocalPoint => {
    const maxOffsetX = imageSize.width - containerSize.width;
    const maxOffsetY = imageSize.height - containerSize.height;
    if (maxOffsetX === 0 && maxOffsetY === 0) return { x: 0.5, y: 0.5 };
    return {
      x:
        maxOffsetX > 0
          ? Math.round((-position.x / maxOffsetX) * 100) / 100
          : 0.5,
      y:
        maxOffsetY > 0
          ? Math.round((-position.y / maxOffsetY) * 100) / 100
          : 0.5,
    };
  }, [position, imageSize, containerSize]);

  // Compute the visible "window" rect over the full image for the overlay
  const overlayStyle = containerSize.width > 0 && imageSize.width > 0;

  return (
    <Dialog open={open} onOpenChange={() => onSkip()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adjust Image Position</DialogTitle>
          <DialogDescription>
            Drag to reposition. The visible area shows how this image will
            appear.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg border bg-muted cursor-grab active:cursor-grabbing select-none"
          style={{ aspectRatio }}
          onMouseDown={handleMouseDown}
        >
          {/* The draggable image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Adjust position"
            draggable={false}
            onLoad={initializePosition}
            className="absolute"
            style={{
              width: imageSize.width || "auto",
              height: imageSize.height || "auto",
              transform: `translate(${position.x}px, ${position.y}px)`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
          />

          {/* Dark overlay on edges showing what gets cropped — LinkedIn style */}
          {overlayStyle && (
            <>
              {/* Top crop zone */}
              {position.y < 0 && (
                <div
                  className="absolute left-0 right-0 top-0 bg-black/40 pointer-events-none"
                  style={{ height: 0 }}
                />
              )}
            </>
          )}

          {/* Subtle vignette border to show crop edges */}
          <div
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.3)",
            }}
          />

          {/* Drag hint — LinkedIn/Facebook style: just text, no crosshair */}
          {!isDragging && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-black/60 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="5 9 2 12 5 15" />
                  <polyline points="9 5 12 2 15 5" />
                  <polyline points="15 19 12 22 9 19" />
                  <polyline points="19 9 22 12 19 15" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="12" y1="2" x2="12" y2="22" />
                </svg>
                Drag to reposition
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onSkip}>
            Skip (use center)
          </Button>
          <Button onClick={() => onSave(getFocalPoint())}>
            Save Position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
