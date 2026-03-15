# Focal Point Modal Redesign

**Date:** 2026-03-14
**Status:** Approved

## Problem

The current focal point modal uses `react-easy-crop`, a library designed for image cropping, not focal point selection. This causes:

1. **Wrong mental model** — zoom sliders, objectFit modes, and crop-area dragging confuse admins who just want to pick which part of an image is important.
2. **Fragile configuration** — `objectFit`, `minZoom`, container aspect ratios, and crop aspect ratios interact in ways that break for different image shapes (portrait in landscape crop, panoramic in square crop, etc.).
3. **Aspect ratio mismatches** — the crop preview didn't match actual display ratios in the RN app (e.g., 3:2 in admin vs 1:1 in app), now fixed but symptomatic of the underlying complexity.

## Solution

Replace `react-easy-crop` with a custom ~100-line component that implements LinkedIn-style drag repositioning.

### Core UX

1. **Full image visible** — the image scales to fill the crop rectangle along one axis. The other axis overflows, creating draggable space.
2. **Fixed crop rectangle** — overlaid on the image at the exact target aspect ratio (16:9, 1:1, 4:3, etc.). Dark overlay dims areas outside the crop zone.
3. **Single-axis drag** — admin drags the image behind the crop rectangle along the overflow axis only (vertical for tall images in wide crops, horizontal for wide images in tall crops).
4. **Live preview** — small preview below the drag area shows exactly how the image will appear at the target aspect ratio, updating in real-time.
5. **No zoom** — image auto-scales to fill the crop rectangle. No slider, no confusion.

### UI Elements

- **Aspect badge** (top-right corner): shows "16:9", "1:1", etc. so the admin knows what shape they're framing for.
- **Rule-of-thirds grid**: subtle grid lines inside the crop area for composition guidance.
- **Drag hint pill**: "Drag to reposition" with arrow icon. Fades out on first drag. Resets on modal open (per-mount, not persisted). Hidden when drag is disabled (exact aspect match).
- **Reset button**: snaps image back to center position. Re-shows drag hint.
- **Save Position button**: commits the focal point. Always enabled (saves `{0.5, 0.5}` when no overflow).
- **X button / click outside**: calls `onSkip`. The modal is agnostic about what skip means — callers decide (e.g., `image-input.tsx` commits with center default, `carousel-image-grid.tsx` simply closes).

### Visual Design

- Dark background (`#09090b`) for the drag area — makes the image pop and the dark overlay natural.
- Crop rectangle bordered with subtle white lines (`rgba(255,255,255,0.45)`).
- Dimmed overlays (`rgba(0,0,0,0.55)`) above/below (or left/right) the crop zone.
- Matches existing admin portal dark dialog styling.

## Technical Design

### Component Interface (unchanged)

```typescript
interface FocalPointModalProps {
  open: boolean;
  imageUrl: string;
  aspectRatio: number;          // e.g. 16/9, 1, 4/3
  initialFocalPoint?: { x: number; y: number };  // 0-1 range, defaults to {x: 0.5, y: 0.5}
  onSave: (point: { x: number; y: number }) => void;
  onSkip: () => void;
}
```

Props are identical to today. This is a drop-in replacement. No changes needed in any consuming form.

### Event Handling

Use pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`) for unified mouse + touch support. Set `touch-action: none` on the drag area to prevent browser scroll during drag. Call `setPointerCapture` on pointer down to track moves even if pointer leaves the element.

### Image Loading

Show a centered loading spinner (existing `Loader2` icon from lucide) while the image loads. On load, read `naturalWidth`/`naturalHeight` to calculate overflow and set initial position. On error, show a fallback message and disable save.

### Drag Math

When the image loads, determine the overflow axis:

```
imageAspect = naturalWidth / naturalHeight
cropAspect = aspectRatio

if imageAspect > cropAspect:
  // Image is wider than crop → scale by height, drag horizontally
  displayHeight = containerCropHeight
  displayWidth = displayHeight * imageAspect
  overflowX = displayWidth - containerCropWidth
  overflowY = 0
else:
  // Image is taller than crop → scale by width, drag vertically
  displayWidth = containerCropWidth
  displayHeight = displayWidth / imageAspect
  overflowX = 0
  overflowY = displayHeight - containerCropHeight
```

Drag is constrained to the overflow axis. Position clamped so the image always covers the crop rectangle. React state updates on each pointer move (React batches renders, no manual RAF needed for the drag itself).

### Focal Point Calculation

Convert drag offset to 0-1 focal point:

```
if overflowX > 0:
  focalX = clamp(offsetX / overflowX, 0, 1)
  focalY = 0.5  // no vertical overflow
else:
  focalX = 0.5  // no horizontal overflow
  focalY = clamp(offsetY / overflowY, 0, 1)
```

This maps directly to CSS `object-position` and expo-image `contentPosition` — the same formula used today.

### Initial Position from `initialFocalPoint`

When editing an existing image, reverse the formula to set the initial drag offset:

```
offsetX = initialFocalPoint.x * overflowX
offsetY = initialFocalPoint.y * overflowY
```

### Live Preview

A small `<div>` below the drag area with:
- `overflow: hidden`
- `aspect-ratio` matching the target
- Contains an `<img>` with `object-fit: cover` and `object-position: ${focalX * 100}% ${focalY * 100}%`

Updates on every state change (same render cycle as drag position).

### Container Layout

```
+----------------------------------+
| Adjust Image Position        [X] |
| Drag to reposition...           |
+----------------------------------+
|  [dark bg]                       |
|  ████████████████████████████    |  ← dimmed overlay (cropped area)
|  ┌──────────────────────────┐    |
|  │     crop rectangle       │    |  ← visible area, grid lines
|  │     (target aspect)      │    |
|  └──────────────────────────┘    |
|  ████████████████████████████    |  ← dimmed overlay (cropped area)
|  [drag to reposition ↕]         |
+----------------------------------+
| PREVIEW                          |
| ┌──────────────────────────┐    |
| │   live preview at ratio   │    |
| └──────────────────────────┘    |
+----------------------------------+
|              [Reset] [Save]      |
+----------------------------------+
```

The drag area has a fixed height of 340px. The crop rectangle is centered within it at the target aspect ratio. Overlays fill the space above/below (or left/right for horizontal overflow).

## What Changes

### Files Modified

| File | Change |
|------|--------|
| `src/components/shared/focal-point-modal.tsx` | Complete rewrite — custom component replaces react-easy-crop |
| `package.json` | Remove `react-easy-crop` dependency |

### Files NOT Modified

- `src/components/ui/image-input.tsx` — no changes, same props
- `src/components/shared/sortable-image-gallery.tsx` — no changes
- `src/components/features/carousel/carousel-image-grid.tsx` — no changes
- All form components — no changes
- All server actions — no changes
- All RN app code — no changes
- Database schema — no changes

### Dependencies

- **Remove:** `react-easy-crop` from `package.json`
- **Add:** none

## Aspect Ratio Mapping (Verified)

| Image Surface | Admin `aspectRatio` | RN Display |
|---|---|---|
| Carousel banner | `16/9` | `16:9` |
| Listing thumbnail | `1` | `1:1` |
| Listing gallery | `4/3` | `4:3` |
| Equipment main category | `1` | `1:1` circle |
| Equipment sub-category | `1` | `1:1` square |
| Attachment category | `1` | `1:1` square |
| Article cover | `16/9` | `16:9` |

## Edge Cases

1. **Image matches crop aspect ratio exactly** — no overflow on either axis. Image fills crop perfectly. Drag is disabled (nothing to reposition). Drag hint is hidden. Grid lines still show. Save button enabled (saves `{0.5, 0.5}`). Modal still opens per design decision.
2. **Very wide panoramic in 1:1 crop** — large horizontal overflow. Admin drags left/right to select which horizontal section shows in the circle.
3. **Portrait photo in 16:9 crop** — large vertical overflow. Admin drags up/down to select which vertical section shows in the banner.
4. **Blob/object URLs** — same as today. `imageUrl` accepts both R2 URLs and `blob:` URLs for newly selected files.
5. **Image load failure** — show fallback text in drag area, disable save button.

## Out of Scope

- **Keyboard repositioning** (arrow keys) — deferred. Can be added later without interface changes.
- **Multi-aspect preview** — only one aspect ratio per image surface, no need for multi-preview.
