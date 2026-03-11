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

    // Generate unique filename: chat/{sessionId}/{timestamp}-{randomId}.{ext}
    const ext = file.name.split(".").pop() ?? "bin";
    const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const r2Path = `chat/${sessionId}/`;
    const result = await uploadToR2(file, r2Path, uniqueName);
    results.push({
      fileUrl: result.url,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  }

  return { success: true as const, attachments: results };
}
