/**
 * Seed sample enquiries for testing.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-enquiries.ts
 */

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
  console.log("Seeding sample enquiries...\n");

  // 1. Get enquiry status IDs
  const statuses = await d1Query<{ id: number; status_name: string }>(
    "SELECT id, status_name FROM enquiry_status_type",
  );
  const pendingId = statuses.results.find((s) => s.status_name === "Pending")?.id;
  const resolvedId = statuses.results.find((s) => s.status_name === "Resolved")?.id;

  if (!pendingId || !resolvedId) {
    console.error("Missing enquiry_status_type rows. Run seed-enquiry-status first.");
    process.exit(1);
  }
  console.log(`  Status IDs: Pending=${pendingId}, Resolved=${resolvedId}`);

  // 2. Get existing customers
  const customers = await d1Query<{ customer_id: number; username: string }>(
    "SELECT customer_id, username FROM customer LIMIT 10",
  );
  console.log(`  Found ${customers.results.length} customer(s)`);

  // 3. Get existing sale listings
  const saleListings = await d1Query<{ id: number }>(
    "SELECT id FROM sale_listing LIMIT 10",
  );
  console.log(`  Found ${saleListings.results.length} sale listing(s)`);

  // 4. Get existing rent listings
  const rentListings = await d1Query<{ id: number }>(
    "SELECT id FROM rent_listing LIMIT 10",
  );
  console.log(`  Found ${rentListings.results.length} rent listing(s)`);

  // 5. Check existing enquiries
  const existing = await d1Query<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM enquiry",
  );
  if (existing.results[0]?.cnt > 0) {
    console.log(`\n  ${existing.results[0].cnt} enquiries already exist. Skipping seed.`);
    console.log("Done!");
    return;
  }

  // 6. Build enquiry data using whatever exists
  const enquiries: {
    sale_listing_id: number | null;
    rent_listing_id: number | null;
    customer_id: number | null;
    message: string;
    enquiry_status_id: number;
  }[] = [];

  const messages = [
    "Is this equipment still available? I'm interested in purchasing it for our construction project.",
    "What is the lead time for delivery to Yangon? We need it urgently.",
    "Can you provide more details about the condition? Are there any defects or issues?",
    "Is there a warranty included with this equipment? How long does it last?",
    "Can we negotiate the price? We are looking to buy in bulk.",
    "Do you offer financing or installment payment options for this listing?",
    "Can I schedule a site visit to inspect the equipment before purchasing?",
    "Is the operator manual and maintenance history available for this model?",
  ];

  const saleIds = saleListings.results.map((r) => r.id);
  const rentIds = rentListings.results.map((r) => r.id);
  const customerIds = customers.results.map((r) => r.customer_id);

  for (let i = 0; i < messages.length; i++) {
    const customerId = customerIds.length > 0
      ? customerIds[i % customerIds.length]
      : null;

    // Alternate between sale and rent listings
    let saleId: number | null = null;
    let rentId: number | null = null;

    if (i % 2 === 0 && saleIds.length > 0) {
      saleId = saleIds[i % saleIds.length];
    } else if (rentIds.length > 0) {
      rentId = rentIds[i % rentIds.length];
    } else if (saleIds.length > 0) {
      saleId = saleIds[i % saleIds.length];
    }

    // First 5 pending, last 3 resolved
    const statusId = i < 5 ? pendingId : resolvedId;

    enquiries.push({
      sale_listing_id: saleId,
      rent_listing_id: rentId,
      customer_id: customerId,
      message: messages[i],
      enquiry_status_id: statusId,
    });
  }

  // 7. Insert enquiries
  console.log("\n  Inserting enquiries:");
  for (const e of enquiries) {
    await d1Query(
      `INSERT INTO enquiry (sale_listing_id, rent_listing_id, customer_id, message, enquiry_status_id)
       VALUES (?, ?, ?, ?, ?)`,
      [e.sale_listing_id, e.rent_listing_id, e.customer_id, e.message, e.enquiry_status_id],
    );
    const type = e.sale_listing_id ? "sale" : e.rent_listing_id ? "rent" : "none";
    const status = e.enquiry_status_id === pendingId ? "Pending" : "Resolved";
    console.log(`    + [${status}] ${type} listing — "${e.message.slice(0, 50)}..."`);
  }

  console.log(`\n  Inserted ${enquiries.length} enquiries.`);
  console.log("Done!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
