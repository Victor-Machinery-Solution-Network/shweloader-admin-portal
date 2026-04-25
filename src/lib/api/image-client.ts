/**
 * Client-side image processing pipeline that mirrors what `sharp` did
 * server-side, but runs in the browser via WASM (jSquash). Lets us
 * direct-upload to R2 without burning Vercel CPU on every image.
 *
 * Match-with-sharp notes:
 *   - jSquash WebP wraps the same libwebp sharp uses, so encode bytes
 *     should be bit-identical given identical input pixels.
 *   - Default resize method is `lanczos3`, same kernel sharp uses.
 *   - We decode with `imageOrientation: 'none'` to skip auto-rotation,
 *     matching sharp's no-`.rotate()` behavior in upload-helpers.ts.
 */

// Same numbers we used server-side. 100 Mpix matches sharp's
// limitInputPixels; 400 px is the existing thumbnail width; 4×3 is the
// expo-image recommended blurhash component count.
const MAX_INPUT_PIXELS = 100_000_000;
const THUMB_WIDTH = 400;
const BLURHASH_COMPONENTS_X = 4;
const BLURHASH_COMPONENTS_Y = 3;

// Quality settings inherited from server-side processImageFieldRich.
const FULL_WEBP_QUALITY = 80;
const THUMB_WEBP_QUALITY = 70;

export interface ProcessedImage {
  /** Full-size WebP at quality 80. */
  fullBlob: Blob;
  /** 400 px-wide WebP at quality 70. Aspect ratio preserved. */
  thumbBlob: Blob;
  /** BlurHash string for fast placeholders on the mobile app. */
  blurhash: string;
  /** Width and height in pixels of the original image (post EXIF strip). */
  width: number;
  height: number;
}

/**
 * Decode a File into raw RGBA pixels. Uses native `createImageBitmap`
 * (no WASM needed for decode — browsers do this at speed of light),
 * then draws onto an OffscreenCanvas to extract ImageData.
 */
async function decodeToImageData(file: File): Promise<ImageData> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "none" });

  if (bitmap.width * bitmap.height > MAX_INPUT_PIXELS) {
    bitmap.close();
    throw new Error(
      `Image is too large: ${bitmap.width}×${bitmap.height}. Max ${MAX_INPUT_PIXELS / 1_000_000} megapixels.`,
    );
  }

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D canvas context");
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();
  return imageData;
}

/**
 * Run the full pipeline: decode → encode full WebP → resize 400 px →
 * encode thumb WebP → resize 32×32 → blurhash. WASM modules are
 * dynamically imported on first call so the bundle only pays the cost
 * once an image input is actually used.
 */
export async function processImageClient(file: File): Promise<ProcessedImage> {
  const [{ encode: webpEncode }, { default: resize }, { encode: blurhashEncode }] =
    await Promise.all([
      import("@jsquash/webp"),
      import("@jsquash/resize"),
      import("blurhash"),
    ]);

  const imageData = await decodeToImageData(file);
  const { width, height } = imageData;

  const fullBuffer = await webpEncode(imageData, { quality: FULL_WEBP_QUALITY });
  const fullBlob = new Blob([fullBuffer], { type: "image/webp" });

  const thumbHeight = Math.max(1, Math.round((THUMB_WIDTH / width) * height));
  const [thumbImageData, blurhashImageData] = await Promise.all([
    resize(imageData, { width: THUMB_WIDTH, height: thumbHeight }),
    resize(imageData, { width: 32, height: 32 }),
  ]);

  const thumbBuffer = await webpEncode(thumbImageData, { quality: THUMB_WEBP_QUALITY });
  const thumbBlob = new Blob([thumbBuffer], { type: "image/webp" });

  const blurhash = blurhashEncode(
    new Uint8ClampedArray(blurhashImageData.data),
    blurhashImageData.width,
    blurhashImageData.height,
    BLURHASH_COMPONENTS_X,
    BLURHASH_COMPONENTS_Y,
  );

  return { fullBlob, thumbBlob, blurhash, width, height };
}

/**
 * Build matched filenames for the full + thumbnail variants of one
 * source image. Same timestamp on both so the pair stays grouped in R2
 * listings and is easy to correlate during debugging.
 */
export function buildImageFilenames(file: File): {
  fullFilename: string;
  thumbFilename: string;
} {
  const dot = file.name.lastIndexOf(".");
  const base = dot > 0 ? file.name.slice(0, dot) : file.name;
  const slug =
    base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "image";
  const stem = `${slug}-${Date.now()}`;
  return {
    fullFilename: `${stem}.webp`,
    thumbFilename: `${stem}-thumb.webp`,
  };
}
