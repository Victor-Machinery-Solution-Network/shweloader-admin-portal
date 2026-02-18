/**
 * Seed one customer + partner approval request.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-customer-partner.ts
 */

import bcrypt from "bcryptjs";

const D1_BASE_URL =
  process.env.NEXT_PUBLIC_D1_API_URL ||
  "https://cloudflare-d1-rest-api.shweloader.workers.dev";
const D1_API_TOKEN = process.env.D1_API_TOKEN || "";

async function d1Query<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<{ results: T[] }> {
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
  console.log("Seeding customer + partner approval request...\n");

  // 1. Check if customer already exists
  const existing = await d1Query<{ customer_id: number }>(
    "SELECT customer_id FROM customer WHERE email = ?",
    ["john@example.com"],
  );

  let customerId: number;

  if (existing.results.length > 0) {
    customerId = existing.results[0].customer_id;
    console.log(`  Customer already exists (ID: ${customerId}). Skipping insert.`);
  } else {
    // 2. Hash password
    const passwordHash = await bcrypt.hash("customer123!", 12);

    // 3. Insert customer
    await d1Query(
      `INSERT INTO customer (username, email, password_hash, phone, is_verified, company_name, office_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "john_doe",
        "john@example.com",
        passwordHash,
        "+959123456789",
        1,
        "John's Construction Co.",
        "No. 45, Pyay Road, Yangon",
      ],
    );

    // Get the inserted customer ID
    const inserted = await d1Query<{ customer_id: number }>(
      "SELECT customer_id FROM customer WHERE email = ?",
      ["john@example.com"],
    );
    customerId = inserted.results[0].customer_id;
    console.log(`  + Customer created (ID: ${customerId})`);
    console.log(`    username: john_doe`);
    console.log(`    email: john@example.com`);
    console.log(`    company: John's Construction Co.`);
  }

  // 4. Get partner_type ID (use first available)
  const partnerTypes = await d1Query<{ id: number; name: string }>(
    "SELECT id, name FROM partner_type LIMIT 1",
  );

  if (partnerTypes.results.length === 0) {
    console.error("\n  No partner_type rows found. Seed partner types first.");
    process.exit(1);
  }

  const partnerTypeId = partnerTypes.results[0].id;
  console.log(`  Partner type: ${partnerTypes.results[0].name} (ID: ${partnerTypeId})`);

  // 5. Get "Pending" status ID
  const statuses = await d1Query<{ id: number; status_name: string }>(
    "SELECT id, status_name FROM partner_status_type WHERE status_name = ?",
    ["Pending"],
  );

  if (statuses.results.length === 0) {
    console.error('\n  No "Pending" partner_status_type found. Seed partner statuses first.');
    process.exit(1);
  }

  const pendingStatusId = statuses.results[0].id;
  console.log(`  Status: Pending (ID: ${pendingStatusId})`);

  // 6. Check if partner request already exists for this customer
  const existingPartner = await d1Query<{ id: number }>(
    "SELECT id FROM partner WHERE customer_id = ?",
    [customerId],
  );

  if (existingPartner.results.length > 0) {
    console.log(`\n  Partner request already exists (ID: ${existingPartner.results[0].id}). Skipping.`);
  } else {
    // 7. Create partner approval request
    await d1Query(
      `INSERT INTO partner (customer_id, partner_type_id, status_id)
       VALUES (?, ?, ?)`,
      [customerId, partnerTypeId, pendingStatusId],
    );

    const insertedPartner = await d1Query<{ id: number }>(
      "SELECT id FROM partner WHERE customer_id = ?",
      [customerId],
    );
    console.log(`\n  + Partner approval request created (ID: ${insertedPartner.results[0].id})`);
    console.log(`    Status: Pending (awaiting admin review)`);
  }

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
