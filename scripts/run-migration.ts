/**
 * Run soft-delete schema migrations against D1 via Worker REST API.
 *
 * Usage: npx tsx --env-file=.env.local scripts/run-migration.ts
 *
 * Reads SQL from docs/migrations/001-soft-delete-columns.sql and
 * docs/migrations/002-trash-metadata.sql, splits into individual
 * statements, and executes each one via the /query endpoint.
 *
 * Safe to run multiple times — ALTER TABLE errors for duplicate columns
 * are caught and reported as skipped.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Config ──────────────────────────────────────────────────────────
const WORKER_URL = process.env.CLOUDFLARE_WORKER_API_URL;
const API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN;

if (!WORKER_URL || !API_TOKEN) {
  console.error(
    "Missing CLOUDFLARE_WORKER_API_URL or CLOUDFLARE_WORKER_API_TOKEN env vars.\n" +
      "Run with: npx tsx --env-file=.env.local scripts/run-migration.ts",
  );
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Execute a single SQL statement via the Worker /query endpoint */
async function execSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${WORKER_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();

  if (!res.ok) {
    // Try to extract error message from JSON response
    try {
      const data = JSON.parse(text);
      return { success: false, error: data.error || `HTTP ${res.status}` };
    } catch {
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
  }

  // Check for D1-level errors in the response body
  try {
    const data = JSON.parse(text);
    if (data.success === false) {
      return { success: false, error: data.error || "Unknown D1 error" };
    }
  } catch {
    // non-JSON 2xx is fine (e.g. empty 204)
  }

  return { success: true };
}

/** Parse a .sql file into individual statements (ignoring comments and blanks) */
function parseStatements(filePath: string): string[] {
  const raw = readFileSync(filePath, "utf-8");
  return raw
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0)
    .map((s) => s + ";");
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const root = resolve(__dirname, "..");
  const migrationFiles = [
    resolve(root, "docs/migrations/001-soft-delete-columns.sql"),
    resolve(root, "docs/migrations/002-trash-metadata.sql"),
  ];

  let total = 0;
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of migrationFiles) {
    const shortName = file.split("/").slice(-2).join("/");
    console.log(`\n--- ${shortName} ---`);

    const statements = parseStatements(file);
    console.log(`  ${statements.length} statement(s) to run\n`);

    for (const stmt of statements) {
      total++;
      // Compact label: first 90 chars of the statement on one line
      const label = stmt.replace(/\s+/g, " ").slice(0, 90);

      const result = await execSQL(stmt);

      if (result.success) {
        succeeded++;
        console.log(`  OK    ${label}`);
      } else {
        const err = result.error || "";
        // D1 returns "duplicate column name" when column already exists
        const isDuplicate =
          err.toLowerCase().includes("duplicate column") ||
          err.toLowerCase().includes("already exists");

        if (isDuplicate) {
          skipped++;
          console.log(`  SKIP  (already exists): ${label}`);
        } else {
          failed++;
          console.log(`  FAIL  ${label}`);
          console.log(`        Error: ${err}`);
        }
      }
    }
  }

  console.log("\n--- Summary ---");
  console.log(`  Total:     ${total}`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log("\nMigration complete.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
