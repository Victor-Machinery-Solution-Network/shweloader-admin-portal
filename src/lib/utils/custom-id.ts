/**
 * Listing custom_id helpers.
 *
 * Format: `{state}L{product_type}-{4digits}{2letters}`
 *   state ∈ {S, R, B} → sale-only, rent-only, both
 *   product_type ∈ {E, A} → equipment, attachment
 *   Suffix: 4 digits + 2 uppercase letters (O/I/L excluded for legibility)
 *
 * Examples: SLE-1234AB (sale equipment), BLA-5678YZ (both, attachment).
 *
 * The suffix is stored on `product_list.custom_id_suffix` and is stable for
 * the lifetime of the product. The prefix is derived at read time from the
 * product type and current listing state — never persisted.
 */

const DIGITS = "0123456789";
const LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ"; // 23 chars, excludes O/I/L

/** Generate a fresh 4-digit + 2-letter suffix using a CSPRNG. */
export function randomCustomIdSuffix(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const digits = Array.from(bytes.subarray(0, 4), (b) => DIGITS[b % DIGITS.length]).join("");
  const letters = Array.from(bytes.subarray(4, 6), (b) => LETTERS[b % LETTERS.length]).join("");
  return `${digits}${letters}`;
}

export type ListingState = "sale" | "rent" | "both";
export type ProductType = "equipment" | "attachment";

/** Compose the displayed custom_id from suffix + product type + current state. */
export function composeCustomId(
  suffix: string,
  productType: ProductType,
  state: ListingState,
): string {
  const stateLetter = state === "both" ? "B" : state === "sale" ? "S" : "R";
  const typeLetter = productType === "equipment" ? "E" : "A";
  return `${stateLetter}L${typeLetter}-${suffix}`;
}

/**
 * SQL fragment that composes the displayed custom_id at read time.
 *
 * Assumes the surrounding query exposes:
 *   - `pl.custom_id_suffix`, `pl.equipment_model_id` (product_list)
 *   - non-deleted sale_listing / rent_listing rows aliased as `sl` / `rl`
 *     (use LEFT JOIN ... AND deleted_at IS NULL so absence means NULL id)
 *
 * Pass alias overrides if your query uses different aliases.
 */
export function customIdSqlExpr(opts?: {
  productList?: string;
  saleListing?: string;
  rentListing?: string;
}): string {
  const pl = opts?.productList ?? "pl";
  const sl = opts?.saleListing ?? "sl";
  const rl = opts?.rentListing ?? "rl";
  return `(
    CASE
      WHEN ${sl}.id IS NOT NULL AND ${rl}.id IS NOT NULL THEN 'B'
      WHEN ${sl}.id IS NOT NULL THEN 'S'
      ELSE 'R'
    END
    || 'L' ||
    CASE WHEN ${pl}.equipment_model_id IS NOT NULL THEN 'E' ELSE 'A' END
    || '-' || ${pl}.custom_id_suffix
  )`;
}
