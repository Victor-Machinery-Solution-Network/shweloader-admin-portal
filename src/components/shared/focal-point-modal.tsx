"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, Move } from "lucide-react";
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

const CONTAINER_HEIGHT = 340;

function formatAspectLabel(ratio: number): string {
  if (ratio === 1) return "1 : 1";
  if (Math.abs(ratio - 16 / 9) < 0.01) return "16 : 9";
  if (Math.abs(ratio - 4 / 3) < 0.01) return "4 : 3";
  if (Math.abs(ratio - 16 / 10) < 0.01) return "16 : 10";
  if (Math.abs(ratio - 3 / 2) < 0.01) return "3 : 2";
  return `${ratio.toFixed(2)} : 1`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  const imgRef = useRef<HTMLImageElement>(null);

  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Layout as state so render always has correct values
  const [layout, setLayout] = useState({
    cropWidth: 0,
    cropHeight: 0,
    cropTop: 0,
    cropLeft: 0,
    displayWidth: 0,
    displayHeight: 0,
    overflowX: 0,
    overflowY: 0,
  });
  const loaded = layout.cropWidth > 0;

  // Drag offset in pixels (how far the image is shifted from its "start" position)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 });

  // Calculate layout synchronously when image loads
  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !img.naturalWidth) return;

    setError(false);

    const containerWidth = container.clientWidth;
    const imageAspect = img.naturalWidth / img.naturalHeight;

    // Crop rectangle: fit the target aspect ratio centered in the container
    // Inset so the crop never touches the edges
    const PAD = 16;
    const usableWidth = containerWidth - PAD * 2;
    let cropWidth: number;
    let cropHeight: number;
    if (usableWidth / CONTAINER_HEIGHT > aspectRatio) {
      cropHeight = CONTAINER_HEIGHT;
      cropWidth = cropHeight * aspectRatio;
    } else {
      cropWidth = usableWidth;
      cropHeight = cropWidth / aspectRatio;
    }
    const cropTop = (CONTAINER_HEIGHT - cropHeight) / 2;
    const cropLeft = (containerWidth - cropWidth) / 2;

    // Image display size: scale to FILL crop along one axis, overflow along the other
    let displayWidth: number;
    let displayHeight: number;
    if (imageAspect > aspectRatio) {
      // Image wider than crop → match heights, overflow horizontally
      displayHeight = cropHeight;
      displayWidth = displayHeight * imageAspect;
    } else {
      // Image taller than crop → match widths, overflow vertically
      displayWidth = cropWidth;
      displayHeight = displayWidth / imageAspect;
    }

    const overflowX = displayWidth - cropWidth;
    const overflowY = displayHeight - cropHeight;

    setLayout({
      cropWidth, cropHeight, cropTop, cropLeft,
      displayWidth, displayHeight, overflowX, overflowY,
    });

    // Set initial offset from initialFocalPoint
    setOffset({
      x: initialFocalPoint.x * overflowX,
      y: initialFocalPoint.y * overflowY,
    });
  }, [aspectRatio, initialFocalPoint]);

  const handleImageError = useCallback(() => {
    setError(true);
  }, []);

  // Reset state when modal opens with new image
  useEffect(() => {
    if (open) {
      setLayout({ cropWidth: 0, cropHeight: 0, cropTop: 0, cropLeft: 0, displayWidth: 0, displayHeight: 0, overflowX: 0, overflowY: 0 });
      setError(false);
      setShowHint(true);
      setDragging(false);
      setOffset({ x: 0, y: 0 });
    }
  }, [open, imageUrl]);

  // ── Pointer drag handlers ──────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const { overflowX, overflowY } = layout;
      if (overflowX === 0 && overflowY === 0) return; // nothing to drag

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      setShowHint(false);
      dragStart.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    },
    [offset]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const { overflowX, overflowY } = layout;
      const dx = e.clientX - dragStart.current.pointerX;
      const dy = e.clientY - dragStart.current.pointerY;

      setOffset({
        x: clamp(dragStart.current.offsetX - dx, 0, overflowX),
        y: clamp(dragStart.current.offsetY - dy, 0, overflowY),
      });
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // ── Focal point from current offset ────────────────────

  const getFocalPoint = useCallback((): FocalPoint => {
    const { overflowX, overflowY } = layout;
    return {
      x: overflowX > 0 ? Math.round((offset.x / overflowX) * 100) / 100 : 0.5,
      y: overflowY > 0 ? Math.round((offset.y / overflowY) * 100) / 100 : 0.5,
    };
  }, [offset]);

  const handleReset = useCallback(() => {
    const { overflowX, overflowY } = layout;
    setOffset({ x: overflowX / 2, y: overflowY / 2 });
    setShowHint(true);
  }, []);

  // ── Derived values for rendering ───────────────────────

  const canDrag = layout.overflowX > 0 || layout.overflowY > 0;
  const focal = getFocalPoint();

  // Image position: offset from crop top-left
  // maxWidth/maxHeight "none" overrides Tailwind's img reset (max-width:100%, height:auto)
  const imgStyle: React.CSSProperties = loaded
    ? {
        position: "absolute" as const,
        width: layout.displayWidth || "100%",
        height: layout.displayHeight || "auto",
        maxWidth: "none",
        maxHeight: "none",
        left: layout.cropLeft - offset.x,
        top: layout.cropTop - offset.y,
        pointerEvents: "none" as const,
      }
    : { display: "none" };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onSkip(); }}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-[17px]">Adjust Image Position</DialogTitle>
          <DialogDescription>
            Drag to reposition. The highlighted area is what will be shown.
          </DialogDescription>
        </DialogHeader>

        {/* ── Drag Area ─────────────────────────────────── */}
        <div
          ref={containerRef}
          className="relative mx-4 mt-3 overflow-hidden rounded-xl bg-[#09090b]"
          style={{ height: CONTAINER_HEIGHT, touchAction: "none", cursor: canDrag ? (dragging ? "grabbing" : "grab") : "default" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Image — positioned absolutely based on drag offset */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={imgStyle}
            draggable={false}
          />

          {/* Loading state */}
          {!loaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-white/40" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-white/40">Failed to load image</p>
            </div>
          )}

          {/* Overlays + crop rectangle (only when loaded) */}
          {loaded && (
            <>
              {/* Dimmed overlays — use box-shadow on crop rect for clean edges */}
              <div
                className="absolute pointer-events-none z-10"
                style={{
                  top: layout.cropTop,
                  left: layout.cropLeft,
                  width: layout.cropWidth,
                  height: layout.cropHeight,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
                }}
              />

              {/* Crop frame with corner brackets */}
              <div
                className="absolute pointer-events-none z-20"
                style={{
                  top: layout.cropTop,
                  left: layout.cropLeft,
                  width: layout.cropWidth,
                  height: layout.cropHeight,
                }}
              >
                {/* Outer border — subtle */}
                <div className="absolute inset-0 border border-white/20 rounded-[2px]" />

                {/* Corner brackets — 20px arms, 2px thick */}
                {/* Top-left */}
                <div className="absolute -top-px -left-px w-5 h-0.5 bg-white rounded-full" />
                <div className="absolute -top-px -left-px h-5 w-0.5 bg-white rounded-full" />
                {/* Top-right */}
                <div className="absolute -top-px -right-px w-5 h-0.5 bg-white rounded-full" />
                <div className="absolute -top-px -right-px h-5 w-0.5 bg-white rounded-full" />
                {/* Bottom-left */}
                <div className="absolute -bottom-px -left-px w-5 h-0.5 bg-white rounded-full" />
                <div className="absolute -bottom-px -left-px h-5 w-0.5 bg-white rounded-full" />
                {/* Bottom-right */}
                <div className="absolute -bottom-px -right-px w-5 h-0.5 bg-white rounded-full" />
                <div className="absolute -bottom-px -right-px h-5 w-0.5 bg-white rounded-full" />

                {/* Rule of thirds — very subtle */}
                <div className="absolute left-0 right-0 top-1/3 h-px bg-white/[0.08]" />
                <div className="absolute left-0 right-0 top-2/3 h-px bg-white/[0.08]" />
                <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/[0.08]" />
                <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/[0.08]" />
              </div>

              {/* Aspect badge */}
              <div className="absolute top-2.5 right-2.5 z-30 rounded-md border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-md pointer-events-none">
                {formatAspectLabel(aspectRatio)}
              </div>

              {/* Drag hint */}
              {showHint && canDrag && (
                <div className="absolute bottom-3.5 left-1/2 z-30 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/70 px-4 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-md pointer-events-none shadow-lg">
                  <Move className="size-3.5" />
                  Drag to reposition
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Live Preview ──────────────────────────────── */}
        {loaded && (
          <div className="px-5 pt-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Preview
            </p>
            <div
              className="overflow-hidden rounded-lg border border-border/50"
              style={{ aspectRatio: String(aspectRatio), maxHeight: 120 }}
            >
              <img
                src={imageUrl}
                alt=""
                className="size-full object-cover"
                style={{
                  objectPosition: `${focal.x * 100}% ${focal.y * 100}%`,
                }}
                draggable={false}
              />
            </div>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────── */}
        <DialogFooter className="px-5 pb-5 pt-3 gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset} disabled={!loaded}>
            Reset
          </Button>
          <Button onClick={() => onSave(getFocalPoint())} disabled={error}>
            Save Position
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
