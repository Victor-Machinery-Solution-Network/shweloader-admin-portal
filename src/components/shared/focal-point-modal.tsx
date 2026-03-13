"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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

  const initializePosition = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.naturalWidth) return;

    const containerWidth = container.clientWidth;
    const containerHeight = containerWidth / aspectRatio;

    const scaleX = containerWidth / img.naturalWidth;
    const scaleY = containerHeight / img.naturalHeight;
    const scale = Math.max(scaleX, scaleY);

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
  }, [aspectRatio, initialFocalPoint]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(initializePosition, 100);
      return () => clearTimeout(timer);
    }
  }, [open, initializePosition]);

  const clampPosition = useCallback(
    (x: number, y: number) => {
      const maxOffsetX = imageSize.width - containerSize.width;
      const maxOffsetY = imageSize.height - containerSize.height;
      return {
        x: Math.min(0, Math.max(-maxOffsetX, x)),
        y: Math.min(0, Math.max(-maxOffsetY, y)),
      };
    },
    [imageSize, containerSize]
  );

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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition(
        clampPosition(dragStart.current.posX + dx, dragStart.current.posY + dy)
      );
    },
    [isDragging, clampPosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getFocalPoint = useCallback((): FocalPoint => {
    const maxOffsetX = imageSize.width - containerSize.width;
    const maxOffsetY = imageSize.height - containerSize.height;
    if (maxOffsetX === 0 && maxOffsetY === 0) return { x: 0.5, y: 0.5 };
    return {
      x: maxOffsetX > 0 ? Math.round((-position.x / maxOffsetX) * 100) / 100 : 0.5,
      y: maxOffsetY > 0 ? Math.round((-position.y / maxOffsetY) * 100) / 100 : 0.5,
    };
  }, [position, imageSize, containerSize]);

  return (
    <Dialog open={open} onOpenChange={() => onSkip()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adjust Image Position</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Drag the image to set the focal point. This controls how the image
            is cropped in different display contexts.
          </p>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg border bg-muted cursor-grab active:cursor-grabbing select-none"
          style={{ aspectRatio }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
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
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
          />

          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white rounded-full shadow-md opacity-60" />
          </div>

          {!isDragging && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
              Drag to reposition
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
