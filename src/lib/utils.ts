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
 * Format a date as relative time, e.g. "3 days ago", "2 months ago".
 */
export function timeAgo(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
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
