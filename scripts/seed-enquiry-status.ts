/**
 * Seed enquiry_status_type rows.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-enquiry-status.ts
 */

const D1_BASE_URL =
  process.env.NEXT_PUBLIC_D1_API_URL ||
  "https://cloudflare-d1-rest-api.shweloader.workers.dev";
const D1_API_TOKEN = process.env.D1_API_TOKEN || "";

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

const STATUSES = ["Pending", "Resolved"];

async function main() {
  console.log("Seeding enquiry_status_type...\n");

  // Check existing
  const existing = await d1Query("SELECT status_name FROM enquiry_status_type");
  const existingNames = new Set(
    (existing.results as { status_name: string }[]).map((r) => r.status_name),
  );

  for (const name of STATUSES) {
    if (existingNames.has(name)) {
      console.log(`  - ${name} (already exists)`);
    } else {
      await d1Query(
        "INSERT INTO enquiry_status_type (status_name) VALUES (?)",
        [name],
      );
      console.log(`  + ${name}`);
    }
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
