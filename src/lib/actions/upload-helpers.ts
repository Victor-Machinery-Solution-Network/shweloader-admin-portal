"use server";

import {
  uploadToR2,
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
  const file = formData.get(fieldName);

  // User explicitly removed the image
  if (formData.get(`${fieldName}_removed`) === "1") {
    return null;
  }

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
