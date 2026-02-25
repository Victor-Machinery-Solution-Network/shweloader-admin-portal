/**
 * Cloudflare R2 Storage Client
 *
 * Connects to: api.staging.shweloader.com.mm
 * Uploads/deletes files via the Cloudflare Worker's /upload endpoint.
 * Public asset URL configured via R2_PUBLIC_URL env var.
 */

const WORKER_URL =
  process.env.CLOUDFLARE_WORKER_API_URL ||
  "https://api.staging.shweloader.com.mm";

const API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

/** Slugify a string for use as an R2 filename */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Check if a value looks like a valid R2 key (not a URL, no path traversal) */
export function isR2Key(key: string): boolean {
  if (!key || key.startsWith("http://") || key.startsWith("https://") || key.includes("..")) {
    return false;
  }
  return true;
}

/** Build a public URL from an R2 key */
export function buildR2Url(key: string): string {
  const prefix = R2_PUBLIC_URL.endsWith("/") ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
  return `${prefix}${key}`;
}

interface UploadResult {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Upload a file to R2 via the Cloudflare Worker.
 *
 * @param file - The File or Blob to upload
 * @param r2Path - The R2 directory path (must end with /)
 * @param filename - The filename to use (already slugified + extension)
 */
export async function uploadToR2(
  file: File | Blob,
  r2Path: string,
  filename: string,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file, filename);
  formData.append("path", r2Path);

  const res = await fetch(`${WORKER_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }));
    throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`);
  }

  const data = (await res.json()) as {
    success: boolean;
    key: string;
    name: string;
    size: number;
    type: string;
  };

  return {
    key: data.key,
    url: buildR2Url(data.key),
    name: data.name,
    size: data.size,
    type: data.type,
  };
}

/**
 * Delete a file from R2 via the Cloudflare Worker.
 * Silently ignores 404s (idempotent).
 *
 * @param key - The R2 object key (e.g. "categories/equipments/main/excavators.webp")
 */
export async function deleteFromR2(key: string): Promise<void> {
  const res = await fetch(`${WORKER_URL}/upload/${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });

  // Silently ignore 404 (file already deleted)
  if (!res.ok && res.status !== 404) {
    console.warn(`R2 delete failed for key "${key}": ${res.status}`);
  }
}
