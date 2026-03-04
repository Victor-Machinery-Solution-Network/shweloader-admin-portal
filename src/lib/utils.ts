import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string as "2 February 2026".
 */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format a date string as relative time, e.g. "3m ago", "2h ago".
 * Falls back to `formatDate` for dates older than 7 days.
 * Appends "Z" to the input because D1 stores UTC timestamps without it.
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + "Z").getTime(); // D1 stores UTC without Z
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

/**
 * Calculate estimated read time in minutes from content.
 * Strips markdown/HTML syntax before counting words. Assumes ~200 words/minute.
 */
export function calculateReadTime(content: string | null): number {
  if (!content?.trim()) return 1;

  const stripped = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/>\s*/g, "")
    .replace(/[-*+]\s+/g, "")
    .replace(/\d+\.\s+/g, "")
    .replace(/---+/g, "")
    .replace(/\n+/g, " ")
    .trim();

  const wordCount = stripped.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Build a Map<K, Set<V>> from an array of link objects.
 * Used for bi-directional many-to-many lookups (brand ↔ category, etc.).
 */
export function buildLinkMap<T>(
  links: T[],
  getKey: (link: T) => number,
  getValue: (link: T) => number,
): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  for (const link of links) {
    const key = getKey(link);
    let set = map.get(key);
    if (!set) {
      set = new Set();
      map.set(key, set);
    }
    set.add(getValue(link));
  }
  return map;
}

/** Convert USD to MMK using the given rate. Returns "" for invalid input. */
export function convertUsdToMmk(usd: string, rate: number): string {
  const n = parseFloat(usd);
  return !isNaN(n) && n > 0 ? String(Math.round(n * rate)) : "";
}

/** Convert MMK to USD using the given rate. Returns "" for invalid input. */
export function convertMmkToUsd(mmk: string, rate: number): string {
  const n = parseFloat(mmk);
  return !isNaN(n) && n > 0 && rate > 0
    ? (n / rate).toFixed(2).replace(/\.?0+$/, "")
    : "";
}
