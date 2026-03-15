const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

/** Convert an R2 key to a full public URL. Returns null for null/undefined/empty keys.
 *  If the value is already a full URL, returns it as-is. */
export function assetUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  const prefix = R2_PUBLIC_URL.endsWith("/")
    ? R2_PUBLIC_URL
    : `${R2_PUBLIC_URL}/`;
  return `${prefix}${key}`;
}
