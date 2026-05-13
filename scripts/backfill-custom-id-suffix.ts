/**
 * Backfill script: assign a unique 4D2L custom_id_suffix to every product_list row.
 *
 * Idempotent: skips rows that already have a suffix.
 *
 * Run order:
 *   1. User adds the column via D1 console:
 *        ALTER TABLE product_list ADD COLUMN custom_id_suffix TEXT;
 *   2. Run this script:
 *        pnpm tsx --env-file=.env.local scripts/backfill-custom-id-suffix.ts
 *   3. User adds the UNIQUE index via D1 console:
 *        CREATE UNIQUE INDEX idx_product_list_custom_id_suffix
 *          ON product_list(custom_id_suffix);
 *
 * Requires CLOUDFLARE_WORKER_API_URL and CLOUDFLARE_WORKER_API_TOKEN.
 */

const DIGITS = "0123456789";
const LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ"; // 23 chars, excludes O/I/L

function randomSuffix(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const digits = Array.from(bytes.subarray(0, 4), (b) => DIGITS[b % DIGITS.length]).join("");
  const letters = Array.from(bytes.subarray(4, 6), (b) => LETTERS[b % LETTERS.length]).join("");
  return `${digits}${letters}`;
}

const D1_BASE_URL =
  process.env.CLOUDFLARE_WORKER_API_URL ||
  "https://api.staging.shweloader.com.mm";
const D1_API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";

async function d1Query<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await fetch(`${D1_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${D1_API_TOKEN}`,
    },
    body: JSON.stringify({ query, params }),
  });
  const data = (await res.json()) as { results?: T[]; error?: string };
  if (!res.ok) throw new Error(`D1 query failed: ${JSON.stringify(data)}`);
  return data.results ?? [];
}

async function main() {
  if (!D1_API_TOKEN) {
    throw new Error(
      "CLOUDFLARE_WORKER_API_TOKEN is missing. Run with --env-file=.env.local",
    );
  }

  const rows = await d1Query<{ id: number }>(
    "SELECT id FROM product_list WHERE custom_id_suffix IS NULL OR custom_id_suffix = ''",
  );

  console.log(`Found ${rows.length} product_list rows needing a suffix.`);

  if (rows.length === 0) {
    console.log("Nothing to backfill. Exiting.");
    return;
  }

  const used = new Set<string>(
    (
      await d1Query<{ custom_id_suffix: string }>(
        "SELECT custom_id_suffix FROM product_list WHERE custom_id_suffix IS NOT NULL AND custom_id_suffix != ''",
      )
    ).map((r) => r.custom_id_suffix),
  );

  let updated = 0;
  let totalRetries = 0;

  for (const row of rows) {
    let suffix = "";
    let attempts = 0;
    const MAX_ATTEMPTS = 25;

    while (attempts < MAX_ATTEMPTS) {
      const candidate = randomSuffix();
      if (!used.has(candidate)) {
        suffix = candidate;
        used.add(candidate);
        break;
      }
      attempts++;
      totalRetries++;
    }

    if (!suffix) {
      throw new Error(
        `Failed to find a unique suffix for product_list.id=${row.id} after ${MAX_ATTEMPTS} attempts.`,
      );
    }

    await d1Query(
      "UPDATE product_list SET custom_id_suffix = ? WHERE id = ?",
      [suffix, row.id],
    );

    updated++;
    if (updated % 50 === 0) {
      console.log(`  …${updated}/${rows.length} done`);
    }
  }

  console.log(
    `\nBackfill complete: ${updated} rows updated, ${totalRetries} collision retries.`,
  );
  console.log("\nNext step — add the UNIQUE index via D1 console:");
  console.log(
    "  CREATE UNIQUE INDEX idx_product_list_custom_id_suffix ON product_list(custom_id_suffix);",
  );
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
