/**
 * Seed default app_setting rows.
 *
 * Idempotent — uses INSERT … ON CONFLICT to skip existing keys.
 *
 * Usage:
 *   npx tsx scripts/seed-settings.ts
 */

const D1_BASE_URL =
  process.env.NEXT_PUBLIC_D1_API_URL ||
  "https://cloudflare-d1-rest-api.shweloader.workers.dev";
const D1_API_TOKEN = process.env.D1_API_TOKEN || "";

interface Setting {
  setting_key: string;
  value: string;
}

const DEFAULT_SETTINGS: Setting[] = [
  { setting_key: "carousel_enabled", value: "true" },
  { setting_key: "announcement_bar_enabled", value: "true" },
  { setting_key: "articles_enabled", value: "true" },
  { setting_key: "exchange_rate", value: "3200" },
];

async function d1Query(query: string, params: unknown[] = []) {
  const res = await fetch(`${D1_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${D1_API_TOKEN}`,
    },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 query failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function main() {
  console.log("Seeding default app settings...\n");

  for (const s of DEFAULT_SETTINGS) {
    await d1Query(
      `INSERT INTO app_setting (setting_key, value)
       VALUES (?, ?)
       ON CONFLICT(setting_key) DO NOTHING`,
      [s.setting_key, s.value],
    );
    console.log(`  ✓ ${s.setting_key} = ${s.value}`);
  }

  console.log("\nDone! Default settings seeded.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
