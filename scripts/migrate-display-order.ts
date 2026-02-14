/**
 * One-time migration: convert display_order values from sequential integers
 * ('0', '1', '2', ...) to fractional-indexing keys ('a0', 'a1', 'a2', ...).
 *
 * Usage: pnpm tsx --env-file=.env.local scripts/migrate-display-order.ts
 */

import { generateNKeysBetween } from "fractional-indexing";

const D1_BASE_URL =
  process.env.NEXT_PUBLIC_D1_API_URL ||
  "https://cloudflare-d1-rest-api.shweloader.workers.dev";
const D1_API_TOKEN = process.env.D1_API_TOKEN || "";

interface QueryResult<T> {
  success: boolean;
  results: T[];
}

async function query<T>(
  sql: string,
  params?: (string | number | boolean | null)[],
): Promise<T[]> {
  const body: { query: string; params?: typeof params } = { query: sql };
  if (params) body.params = params;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (D1_API_TOKEN) {
    headers.Authorization = `Bearer ${D1_API_TOKEN}`;
  }

  const res = await fetch(`${D1_BASE_URL}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 query failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as QueryResult<T>;
  return data.results ?? [];
}

const TABLES = [
  { table: "equipment_main_category", pk: "category_id" },
  { table: "equipment_sub_category", pk: "sub_category_id" },
  { table: "attachment_category", pk: "category_id" },
  { table: "announcement_text", pk: "announcement_id" },
  { table: "featured_listing", pk: "id" },
  { table: "product_image", pk: "image_id" },
];

async function migrateTable(table: string, pk: string) {
  const rows = await query<Record<string, unknown>>(
    `SELECT ${pk}, display_order FROM ${table} ORDER BY CAST(display_order AS INTEGER) ASC, ${pk} ASC`,
  );

  if (rows.length === 0) {
    console.log(`  ${table}: no rows, skipping`);
    return;
  }

  const keys = generateNKeysBetween(null, null, rows.length);

  for (let i = 0; i < rows.length; i++) {
    const id = rows[i][pk];
    await query(
      `UPDATE ${table} SET display_order = ? WHERE ${pk} = ?`,
      [keys[i], id as number],
    );
  }

  console.log(`  ${table}: migrated ${rows.length} rows`);
}

async function migrateCarouselImages() {
  const carousels = await query<{ carousel_id: number }>(
    "SELECT DISTINCT carousel_id FROM carousel_image",
  );

  for (const { carousel_id } of carousels) {
    const rows = await query<{ image_id: number }>(
      "SELECT image_id, display_order FROM carousel_image WHERE carousel_id = ? ORDER BY CAST(display_order AS INTEGER) ASC, image_id ASC",
      [carousel_id],
    );

    if (rows.length === 0) continue;

    const keys = generateNKeysBetween(null, null, rows.length);
    for (let i = 0; i < rows.length; i++) {
      await query(
        "UPDATE carousel_image SET display_order = ? WHERE carousel_id = ? AND image_id = ?",
        [keys[i], carousel_id, rows[i].image_id],
      );
    }
    console.log(
      `  carousel_image (carousel ${carousel_id}): migrated ${rows.length} rows`,
    );
  }
}

async function main() {
  console.log("Migrating display_order to fractional-indexing keys...\n");

  for (const { table, pk } of TABLES) {
    await migrateTable(table, pk);
  }

  await migrateCarouselImages();

  console.log("\nDone! All display_order values are now fractional keys.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
