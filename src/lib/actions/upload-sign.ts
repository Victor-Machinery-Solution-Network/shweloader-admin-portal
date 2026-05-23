"use server";

import { requirePermission } from "@/lib/actions/utils";

const WORKER_URL =
  process.env.CLOUDFLARE_WORKER_API_URL ||
  "https://api.staging.shweloader.com.mm";

const API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";

export interface UploadCredentials {
  uploadUrl: string;
  token: string;
  exp: number;
  path: string;
}

/**
 * Mint a short-lived, path-scoped upload token so the browser can PUT
 * directly to R2 (via the Worker's /upload/direct endpoint), bypassing
 * Vercel's 4.5 MB serverless body limit.
 *
 * Caller must already have the feature permission they're uploading for;
 * the same RBAC check the create/edit action will enforce later.
 */
export async function requestUploadSignature(
  feature: string,
  permission: "create" | "edit",
  path: string,
): Promise<UploadCredentials> {
  await requirePermission(feature, permission);

  // Defense-in-depth: only the `pending/` prefix is a legitimate destination
  // for browser-initiated uploads. The Worker should also enforce this, but
  // checking here keeps the admin portal from sending crafted requests in
  // the first place. Reject path traversal, absolute paths, or alternate
  // prefixes that could overwrite committed assets.
  if (path !== "pending/" && !path.startsWith("pending/")) {
    throw new Error("Upload path must be within the pending/ prefix");
  }
  if (path.includes("..") || path.startsWith("/")) {
    throw new Error("Invalid upload path");
  }

  const res = await fetch(`${WORKER_URL}/upload/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ path }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ||
        `Failed to sign upload (${res.status})`,
    );
  }

  return (await res.json()) as UploadCredentials;
}
