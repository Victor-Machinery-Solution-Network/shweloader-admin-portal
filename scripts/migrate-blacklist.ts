/**
 * Migration: Create blacklist table + add deleted_at to 7 entities
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/migrate-blacklist.ts
 */

const D1_BASE_URL =
  process.env.CLOUDFLARE_WORKER_API_URL ||
  "https://api.staging.shweloader.com.mm";
const D1_API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";

async function run(query: string) {
  const res = await fetch(`${D1_BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${D1_API_TOKEN}`,
    },
    body: JSON.stringify({ query, params: [] }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? JSON.stringify(data);
    // Ignore "duplicate column" errors (column already exists)
    if (msg.includes("duplicate column")) {
      console.log("SKIP (exists):", query.slice(0, 70));
      return;
    }
    console.error("FAIL:", query.slice(0, 70), msg);
    return;
  }
  console.log("OK:", query.slice(0, 70));
}

async function main() {
  console.log("=== Blacklist Migration ===\n");

  // 1. Create blacklist table
  await run(`CREATE TABLE IF NOT EXISTS blacklist (
    blacklist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_user_id INTEGER NOT NULL,
    phone TEXT,
    email TEXT,
    company_name TEXT,
    reason TEXT NOT NULL,
    blacklisted_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE CASCADE,
    FOREIGN KEY (blacklisted_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
  )`);

  await run(
    "CREATE INDEX IF NOT EXISTS idx_blacklist_app_user ON blacklist(app_user_id)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_blacklist_phone ON blacklist(phone)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_blacklist_email ON blacklist(email)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_blacklist_company ON blacklist(company_name)",
  );
  await run(
    "CREATE INDEX IF NOT EXISTS idx_blacklist_blacklisted_by ON blacklist(blacklisted_by)",
  );

  // 2. Add deleted_at to 7 major entity tables
  const tables = [
    "app_user",
    "product_list",
    "sale_listing",
    "rent_listing",
    "article",
    "partner",
    "enquiry",
  ];

  for (const table of tables) {
    await run(
      `ALTER TABLE ${table} ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL`,
    );
    await run(
      `CREATE INDEX IF NOT EXISTS idx_${table}_deleted_at ON ${table}(deleted_at)`,
    );
  }

  console.log("\n=== Migration Complete ===");
}

main().catch(console.error);
