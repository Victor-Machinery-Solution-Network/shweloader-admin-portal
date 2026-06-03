import { waitUntil } from "@vercel/functions";

/**
 * Public web app origin to revalidate, set per Vercel environment
 * (PUBLIC_SITE_URL). Trailing slash trimmed so we can append cleanly.
 */
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
/** Shared secret — must match the public app's REVALIDATE_SECRET. */
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? "";

/**
 * Fire-and-forget POST to the public web app's `/api/revalidate` webhook so an
 * admin catalog change busts the public site's Vercel Data Cache in seconds,
 * instead of waiting on its `cacheLife` TTL (hours for listings, days for
 * taxonomy).
 *
 * Mirrors the `auditLog` pattern in `actions/audit.ts`: the network call is
 * wrapped in `waitUntil` so the Vercel function container stays alive until it
 * lands, but callers never `await` it — so admin-save latency is unchanged.
 * Errors are logged and swallowed; a failed revalidate must never break a write
 * (the public site simply falls back to its TTL).
 *
 * The public webhook treats an empty/missing `tags` array as "revalidate
 * EVERYTHING", so we deliberately bail on an empty list rather than send it.
 *
 * @param tags Public cache tags to revalidate, e.g. `["listings"]` or
 *   `["listing:42"]`. Resolved/mapped by the caller — see `cache-invalidation.ts`.
 */
export function revalidatePublicSite(tags: string[]): void {
  if (!PUBLIC_SITE_URL || !REVALIDATE_SECRET || tags.length === 0) return;

  const post = (async () => {
    try {
      const res = await fetch(`${PUBLIC_SITE_URL}/api/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": REVALIDATE_SECRET,
        },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) {
        console.error(
          `[revalidate] ${res.status} from ${PUBLIC_SITE_URL}/api/revalidate (tags: ${tags.join(", ")})`,
        );
      }
    } catch (error) {
      console.error("[revalidate] Failed to reach public site:", error);
    }
  })();

  // `waitUntil` keeps the serverless container alive until the POST completes;
  // off-Vercel (local dev) it throws, so we swallow — the promise still runs.
  try {
    waitUntil(post);
  } catch {
    /* not on Vercel — promise runs without a keep-alive guarantee */
  }
}
