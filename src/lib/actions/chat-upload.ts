"use server";

import { requirePermission } from "@/lib/actions/utils";
import { uploadToR2 } from "@/lib/api/r2-client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function uploadChatAttachments(
  sessionId: number,
  formData: FormData,
) {
  await requirePermission("chat", "edit");

  const files = formData.getAll("files") as File[];
  if (files.length === 0) return { success: true as const, attachments: [] };
  if (files.length > MAX_FILES) {
    return { success: false as const, error: `Maximum ${MAX_FILES} files per message` };
  }

  const results: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return { success: false as const, error: `File type not allowed: ${file.type}` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { success: false as const, error: `File too large: ${file.name} (max 10MB)` };
    }

    // Convert images to webp via sharp before uploading
    let uploadFile: File | Blob = file;
    let ext = file.name.split(".").pop() ?? "bin";
    let fileType = file.type;

    if (file.type.startsWith("image/") && file.type !== "image/webp") {
      try {
        const sharp = (await import("sharp")).default;
        const buffer = Buffer.from(await file.arrayBuffer());
        const webpBuffer = await sharp(buffer, {
          limitInputPixels: 100_000_000,
          sequentialRead: true,
        })
          .webp({ quality: 80 })
          .toBuffer();

        // Create a File (not Blob) so FormData includes proper metadata
        uploadFile = new File([new Uint8Array(webpBuffer)], file.name.replace(/\.[^.]+$/, ".webp"), {
          type: "image/webp",
        });
        ext = "webp";
        fileType = "image/webp";
      } catch {
        // Fallback to original file if conversion fails
      }
    }

    const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const r2Path = `chat/${sessionId}/`;
    const result = await uploadToR2(uploadFile, r2Path, uniqueName);
    results.push({
      fileUrl: result.key,
      fileName: file.name,
      fileSize: uploadFile.size,
      fileType,
    });
  }

  return { success: true as const, attachments: results };
}
