"use server";

import {
  uploadToR2,
  commitUploadToR2,
  deleteFromR2,
  slugify,
} from "@/lib/api/r2-client";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const PDF_TYPES = new Set(["application/pdf"]);

// Thumbnail width in pixels. 400px covers phone grids at ~2x DPR without
// being wasteful; the WebP-compressed output is typically 15-30KB.
const THUMB_WIDTH = 400;

// Blurhash component counts. 4x3 is the expo-image recommended default —
// small enough to be cheap in the payload (~28 chars) and detailed enough
// for a pleasant preview.
const BLURHASH_X = 4;
const BLURHASH_Y = 3;

/**
 * Convert an image file to WebP format using sharp.
 * Returns the original file if it's a PDF.
 */
async function convertToWebp(file: File): Promise<{ blob: Blob; ext: string }> {
  if (PDF_TYPES.has(file.type)) {
    return { blob: file, ext: ".pdf" };
  }

  const sharp = (await import("sharp")).default;
  const buffer = Buffer.from(await file.arrayBuffer());
  const webpBuffer = await sharp(buffer, {
    limitInputPixels: 100_000_000,
    sequentialRead: true,
  })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    blob: new Blob([new Uint8Array(webpBuffer)], { type: "image/webp" }),
    ext: ".webp",
  };
}

/** Validate a file from FormData */
function validateFile(file: unknown): file is File {
  return !!file && file instanceof File && file.size > 0;
}

function assertFileType(file: File) {
  if (!IMAGE_TYPES.has(file.type) && !PDF_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Allowed: PNG, JPEG, GIF, WebP, PDF");
  }
}

function assertFileSize(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum size is 50MB");
  }
}

/**
 * Process a file field from FormData: validate, convert images to WebP, upload to R2.
 *
 * IMPORTANT: This does NOT delete the old file. The caller must call
 * `deleteFile(existingKey)` AFTER the D1 update succeeds.
 *
 * @param formData - The form data containing the file
 * @param fieldName - The FormData field name (e.g. "image", "pdf")
 * @param r2Path - R2 directory path (e.g. "categories/equipments/main/")
 * @param entityName - Name used for the filename (e.g. category name, model name)
 * @param existingKey - Current R2 key — returned as-is if no new file provided
 * @returns The R2 key of the uploaded file, or existingKey if no new file
 */
export async function processFileField(
  formData: FormData,
  fieldName: string,
  r2Path: string,
  entityName: string,
  existingKey?: string | null,
): Promise<string | null> {
  // Browser uploaded to `pending/...` on file select; now commit it to
  // the final content prefix. If the caller's D1 write throws after this
  // point we have an orphan in the final prefix — the daily cleanup cron
  // sweeps those. Abandoned forms leave files in `pending/` which the
  // R2 lifecycle rule reaps after 1 day.
  const pendingKey = formData.get(`${fieldName}_pending_key`);
  if (typeof pendingKey === "string" && pendingKey) {
    return await commitUploadToR2(pendingKey, r2Path);
  }

  // User explicitly removed the image
  if (formData.get(`${fieldName}_removed`) === "1") {
    return null;
  }

  // Legacy server-side upload path (still used by image fields)
  const file = formData.get(fieldName);

  // No file provided — keep existing
  if (!validateFile(file)) {
    return existingKey || null;
  }

  assertFileType(file);
  assertFileSize(file);

  const { blob, ext } = await convertToWebp(file);
  // Append timestamp when replacing an existing file to bust CDN/browser cache
  const suffix = existingKey ? `-${Date.now()}` : "";
  const filename = `${slugify(entityName)}${suffix}${ext}`;
  const result = await uploadToR2(blob, r2Path, filename);

  return result.key;
}

/**
 * Process a file using the original filename (for carousel images, product photos, etc.)
 * Same as processFileField but uses the original filename instead of entity name.
 *
 * IMPORTANT: This does NOT delete the old file.
 */
export async function processFileWithOriginalName(
  formData: FormData,
  fieldName: string,
  r2Path: string,
  existingKey?: string | null,
): Promise<string | null> {
  const file = formData.get(fieldName);

  // User explicitly removed the image
  if (formData.get(`${fieldName}_removed`) === "1") {
    return null;
  }

  if (!validateFile(file)) {
    return existingKey || null;
  }

  assertFileType(file);
  assertFileSize(file);

  const { blob, ext } = await convertToWebp(file);
  const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
  // Append timestamp when replacing an existing file to bust CDN/browser cache
  const suffix = existingKey ? `-${Date.now()}` : "";
  const filename = `${slugify(nameWithoutExt)}${suffix}${ext}`;
  const result = await uploadToR2(blob, r2Path, filename);

  return result.key;
}

/**
 * Rich result returned by processImageFieldRich — includes the optional
 * 400px variant key (thumb) and a blurhash string for placeholder rendering.
 *
 * A `null` return means "no new file was provided and no existing value";
 * callers should treat that as "clear the column" only if the
 * `<fieldName>_removed` flag was also set (same semantics as processFileField).
 */
export interface RichImageUploadResult {
  key: string;
  thumbKey: string | null;
  blurhash: string | null;
}

/**
 * Like processFileField but additionally:
 *   - generates a 400px-wide WebP thumbnail and uploads it to R2 alongside the full image
 *   - computes a BlurHash string from the pixels, for <expo-image placeholder=...> on the client
 *
 * Use this for images that the mobile app shows at multiple sizes
 * (product photos, article covers, carousel banners, product thumbnails).
 *
 * Failure to generate the thumb or blurhash is non-fatal — the full image
 * still uploads and the caller stores `null` for the missing field.
 *
 * @returns Rich result on successful upload, `{ key, ... }` with existing values
 *          when no new file, or `null` when the field was explicitly removed.
 */
export async function processImageFieldRich(
  formData: FormData,
  fieldName: string,
  r2Path: string,
  entityName: string,
  existing?: {
    key: string | null;
    thumbKey?: string | null;
    blurhash?: string | null;
  } | null,
): Promise<RichImageUploadResult | null> {
  // Browser already decoded, resized, encoded, and direct-uploaded the
  // pair to `pending/...`. Commit both to the final prefix; blurhash was
  // computed client-side and ships in a hidden field. This is the path
  // every image input uses since Phase 2 — the legacy sharp pipeline
  // below stays only as a fallback for any caller still on FormData files.
  const pendingFullKey = formData.get(`${fieldName}_pending_key`);
  if (typeof pendingFullKey === "string" && pendingFullKey) {
    const fullKey = await commitUploadToR2(pendingFullKey, r2Path);
    const pendingThumbKey = formData.get(`${fieldName}_thumb_pending_key`);
    let thumbKey: string | null = null;
    if (typeof pendingThumbKey === "string" && pendingThumbKey) {
      thumbKey = await commitUploadToR2(pendingThumbKey, r2Path);
    }
    const blurhashRaw = formData.get(`${fieldName}_blurhash`);
    return {
      key: fullKey,
      thumbKey,
      blurhash: typeof blurhashRaw === "string" && blurhashRaw ? blurhashRaw : null,
    };
  }

  const file = formData.get(fieldName);

  if (formData.get(`${fieldName}_removed`) === "1") {
    return null;
  }

  if (!validateFile(file)) {
    // No new file — preserve what's already in D1
    if (existing?.key) {
      return {
        key: existing.key,
        thumbKey: existing.thumbKey ?? null,
        blurhash: existing.blurhash ?? null,
      };
    }
    return null;
  }

  assertFileType(file);
  assertFileSize(file);

  const sharp = (await import("sharp")).default;
  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // Full-size WebP (same pipeline as convertToWebp — kept inline so we can
  // share the decoded pixel data with the thumb + blurhash stages without
  // decoding the JPEG/PNG three times).
  const fullWebpBuffer = await sharp(inputBuffer, {
    limitInputPixels: 100_000_000,
    sequentialRead: true,
  })
    .webp({ quality: 80 })
    .toBuffer();

  // Deterministic filename per upload.
  const suffix = existing?.key ? `-${Date.now()}` : "";
  const baseName = `${slugify(entityName)}${suffix}`;
  const fullFilename = `${baseName}.webp`;
  const thumbFilename = `${baseName}-sm.webp`;

  const fullBlob = new Blob([new Uint8Array(fullWebpBuffer)], {
    type: "image/webp",
  });
  const fullResult = await uploadToR2(fullBlob, r2Path, fullFilename);

  // Thumb + blurhash from a single sharp read of the WebP.
  let thumbKey: string | null = null;
  let blurhash: string | null = null;
  try {
    const [thumbBuffer, rawBuffer] = await Promise.all([
      sharp(fullWebpBuffer)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer(),
      // For blurhash: resize to a small raw RGBA buffer (32x32 is plenty
      // for a 4x3 hash). This is much cheaper than hashing the full image.
      sharp(fullWebpBuffer)
        .resize({ width: 32, height: 32, fit: "inside" })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ]);

    const thumbBlob = new Blob([new Uint8Array(thumbBuffer)], {
      type: "image/webp",
    });
    const thumbResult = await uploadToR2(thumbBlob, r2Path, thumbFilename);
    thumbKey = thumbResult.key;

    const { encode } = await import("blurhash");
    blurhash = encode(
      new Uint8ClampedArray(rawBuffer.data),
      rawBuffer.info.width,
      rawBuffer.info.height,
      BLURHASH_X,
      BLURHASH_Y,
    );
  } catch (err) {
    console.warn("thumb/blurhash generation failed:", err);
  }

  return { key: fullResult.key, thumbKey, blurhash };
}

/**
 * Delete an R2 file by its key. Safe to call with null/undefined.
 * Silently ignores missing files (404).
 */
export async function deleteFile(key: string | null | undefined): Promise<void> {
  if (!key) return;
  await deleteFromR2(key);
}

/**
 * Delete an old file from R2 only if the key changed (new file was uploaded).
 * Call this AFTER the D1 update succeeds.
 */
export async function cleanupOldFile(
  oldKey: string | null | undefined,
  newKey: string | null | undefined,
): Promise<void> {
  if (!oldKey || oldKey === newKey) return;
  await deleteFile(oldKey);
}
