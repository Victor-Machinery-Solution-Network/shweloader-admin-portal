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
