import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/**
 * Compute a fractional key between two neighbors.
 * - before=null → insert at the start
 * - after=null → insert at the end
 * - both null → first item ever
 */
export function keyBetween(
  before: string | null,
  after: string | null,
): string {
  return generateKeyBetween(before, after);
}

/**
 * Generate N evenly-spaced keys between two bounds.
 * Used for bulk inserts and migration.
 */
export function nKeysBetween(
  before: string | null,
  after: string | null,
  n: number,
): string[] {
  return generateNKeysBetween(before, after, n);
}
