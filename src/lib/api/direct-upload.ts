import type { UploadCredentials } from "@/lib/actions/upload-sign";

export interface DirectUploadResult {
  key: string;
  name: string;
  size: number;
  type: string;
}

export interface DirectUploadOptions {
  /** Filename stored in R2. Overrides the blob's own name. Sanitized server-side. */
  filename?: string;
  /** Progress in bytes: loaded / total. Only fires when length is computable. */
  onProgress?: (loaded: number, total: number) => void;
  /** Cancel the upload. */
  signal?: AbortSignal;
}

/**
 * Upload a blob directly to R2 via the Worker's /upload/direct endpoint.
 * Uses XMLHttpRequest for upload progress events, which fetch() still
 * can't report in 2026.
 */
export function uploadToR2Direct(
  blob: Blob,
  credentials: UploadCredentials,
  options: DirectUploadOptions = {},
): Promise<DirectUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    const filename =
      options.filename ?? (blob instanceof File ? blob.name : "file");
    formData.append("file", blob, filename);

    xhr.open("POST", credentials.uploadUrl);
    xhr.setRequestHeader("x-upload-token", credentials.token);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) options.onProgress?.(e.loaded, e.total);
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as DirectUploadResult);
        } catch {
          reject(new Error("Invalid upload response"));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(data.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Upload failed: network error")),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener("abort", () => xhr.abort(), {
        once: true,
      });
    }

    xhr.send(formData);
  });
}

/**
 * Build a R2-safe filename from a user-selected File. Slugifies the base
 * name and appends a millisecond timestamp so concurrent uploads never
 * collide inside a single R2 prefix.
 */
export function buildUploadFilename(file: File): string {
  const dot = file.name.lastIndexOf(".");
  const ext = dot > 0 ? file.name.slice(dot).toLowerCase() : "";
  const base = dot > 0 ? file.name.slice(0, dot) : file.name;
  const slug =
    base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "file";
  return `${slug}-${Date.now()}${ext}`;
}
