/**
 * Seed script: Lookup tables + sample app users, partners, enquiries
 *
 * Seeds data that cannot be created through the admin portal UI:
 *   1. Lookup/type tables (partner_type, status types, condition_type)
 *   2. App users (registered via mobile app)
 *   3. Partners (applied via mobile app)
 *   4. Enquiries (submitted via mobile app)
 *
 * Idempotent: skips tables that already have data.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/seed-lookup-tables.ts
 *
 * Requires CLOUDFLARE_WORKER_API_TOKEN and CLOUDFLARE_WORKER_API_URL in .env.local
 */

import bcrypt from "bcryptjs";

// ─── Configuration ──────────────────────────────────────────────────────────

const D1_BASE_URL =
  process.env.CLOUDFLARE_WORKER_API_URL ||
  "https://api.staging.shweloader.com.mm";
const D1_API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";
const BCRYPT_ROUNDS = 12;

// ─── D1 API Helpers ─────────────────────────────────────────────────────────

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

async function d1Execute(query: string, params: unknown[] = []) {
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
    throw new Error(`D1 execute failed (${res.status}): ${text}`);
  }
}

async function d1Count(table: string): Promise<number> {
  const rows = await d1Query<{ c: number }>(
    `SELECT COUNT(*) as c FROM ${table}`,
  );
  return rows[0]?.c ?? 0;
}

async function d1BatchInsert(
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize = 15,
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = batch
      .map(() => `(${columns.map(() => "?").join(", ")})`)
      .join(", ");
    const params = batch.flat();
    await d1Execute(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`,
      params,
    );
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateMyanmarPhone(): string {
  const prefixes = ["9", "97", "95", "96", "99", "94", "91", "92", "93"];
  const prefix = randomItem(prefixes);
  const rest = Array.from(
    { length: 9 - prefix.length },
    () => randomInt(0, 9),
  ).join("");
  return `+959${prefix}${rest}`;
}

// ─── Data Definitions ───────────────────────────────────────────────────────

// Lookup tables
const PARTNER_TYPES = ["Dealer", "Rental Company", "Individual Seller"];
const PARTNER_STATUS_TYPES = ["Pending", "Approved", "Rejected"];
const ENQUIRY_STATUS_TYPES = ["Pending", "Resolved"];
const APPROVAL_STATUS_TYPES = ["Pending", "Approved", "Rework"];
const ARTICLE_STATUS_TYPES = [
  "Draft",
  "Pending Review",
  "Published",
  "Hidden",
  "Rework",
];
const CONDITION_TYPES = [
  "Brand New",
  "Like New",
  "Used - Excellent",
  "Used - Good",
  "Used - Fair",
  "Refurbished",
];

// Myanmar names for sample users
const FIRST_NAMES_MALE = [
  "Aung", "Kyaw", "Myo", "Zaw", "Win", "Hla", "Tun", "Min", "Nay", "Htun",
  "Thein", "Soe", "Naing", "Ye", "Myint", "Than", "Sein", "Wai", "Thiha",
  "Pyae", "Htet", "Lin", "Phyo", "Khant", "Kaung",
];
const FIRST_NAMES_FEMALE = [
  "Aye", "Thin", "Khin", "Su", "May", "Nwe", "Ei", "Cho", "Myat", "Thiri",
  "Hnin", "Yu", "Zin", "Mon", "Wut", "Phyu", "Nandar", "Hsu", "Yadanar",
  "Sandar", "Thazin", "Nilar", "Moe", "Hay", "Shwe",
];
const LAST_NAME_PARTS = [
  "Aung", "Win", "Htun", "Myint", "Hlaing", "Oo", "Zaw", "Min",
  "Soe", "Naing", "Lwin", "Tun", "Kyaw", "Htet", "Thein",
];
const COMPANY_NAMES = [
  "Golden Dragon Construction", "Myanmar Star Builders", "Shwe Thazin Trading",
  "Yangon Heavy Equipment Co.", "Mandalay Mining Corp", "Ayeyarwady Logistics",
  "Bagan Construction Group", "Inle Lake Resources", "Mekong River Trading",
  "Jade Mountain Industries", "Silver Pagoda Enterprises", "Irrawaddy Transport Co.",
  "Kabar Aye Machinery", "Shwe Pyi Taw Engineering", "Golden Land Developers",
  "Myanmar Pacific Construction", "Royal Mandalay Corp", "Sagaing Steel Works",
  "Thanlwin River Mining", "Chindwin Logistics Group", "Pyay Road Construction",
  "Kyaik Htee Yoe Trading", "Shwedagon Enterprises", "Bago River Holdings",
  "Shan Highland Mining Co.", "Delta Star Shipping", "Naypyidaw Builders",
  "Rakhine Coastal Construction", "Mon State Engineering", "Kayin Valley Resources",
  "Chin Hills Timber Co.", "Kachin Jade Trading", "Tanintharyi Marine Services",
  "Pegu Club Developers", "Strand Road Logistics", "Kandawgyi Construction",
  "Inya Lake Properties", "Bogyoke Trading House", "Sule Square Developments",
  "Hledan Center Holdings", "Tamwe Star Construction", "Insein Industrial Co.",
  "Dagon New City Builders", "Hlaing Tharyar Industries", "South Okkalapa Trading",
  "North Dagon Engineering", "Thaketa Shipyard Co.", "Pazundaung Port Services",
  "Lanmadaw Marine Logistics", "Botahtaung Warehouse Co.",
];
const OFFICE_ADDRESSES = [
  "No. 45, Pyay Road, Kamaryut Township, Yangon",
  "No. 123, 78th Street, Chan Aye Thar Zan Township, Mandalay",
  "Building 7, MICT Park, Hlaing Township, Yangon",
  "No. 88, Bogyoke Aung San Road, Pabedan Township, Yangon",
  "No. 15, Strand Road, Lanmadaw Township, Yangon",
  "No. 200, Kaba Aye Pagoda Road, Bahan Township, Yangon",
  "No. 56, 62nd Street, Maha Aung Myay Township, Mandalay",
  "Industrial Zone 1, Hlaing Tharyar Township, Yangon",
  "No. 33, University Avenue, Kamaryut Township, Yangon",
  "No. 77, Merchant Street, Pabedan Township, Yangon",
];
const ENQUIRY_MESSAGES = [
  "Is this equipment still available? I'm interested in purchasing it for our construction project in Yangon.",
  "What is the lead time for delivery to Mandalay? We need it within the next two weeks.",
  "Can you provide more details about the condition? Are there any known issues or defects?",
  "Is there a warranty included with this equipment? How long does the coverage last?",
  "Can we negotiate on the price? We're looking to purchase multiple units for our fleet.",
  "Do you offer financing or installment payment options? We prefer a 12-month plan.",
  "Can I schedule a site visit to inspect the equipment before making a purchase decision?",
  "Is the operator manual and full maintenance history available for this model?",
  "What is the fuel consumption rate per hour? We need to calculate operating costs for our budget.",
  "Are spare parts readily available in Myanmar for this model? Where can we source them?",
  "Does this price include delivery to our project site in Naypyidaw?",
  "We're interested in renting this for 6 months. What's your best monthly rate?",
  "Can you provide references from previous buyers of this model?",
  "Is the machine equipped with an air conditioning cab? It's essential for our operators.",
  "What attachments are included with the purchase? We specifically need a bucket and breaker.",
  "How soon can the machine be available for pickup from your location?",
  "We need this equipment for a government project. Can you provide official documentation and invoices?",
  "Is the undercarriage original or has it been replaced? What percentage of wear remains?",
  "Can we arrange a demonstration before committing? We'd like to test it on our job site conditions.",
  "What's the total cost including import duties and taxes if we need it delivered to Shan State?",
];

// ═════════════════════════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

let step = 0;
const totalSteps = 9;

function log(msg: string) {
  console.log(msg);
}

function stepHeader(title: string) {
  step++;
  console.log(`\n[${step}/${totalSteps}] ${title}`);
  console.log("─".repeat(50));
}

// ── 1. Partner Types ──

async function seedPartnerTypes() {
  stepHeader("Seeding partner_type...");
  const existing = await d1Query<{ name: string }>(
    "SELECT name FROM partner_type",
  );
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = PARTNER_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) {
    log(`  [skip] all ${PARTNER_TYPES.length} types exist`);
    return;
  }
  await d1BatchInsert(
    "partner_type",
    ["name"],
    missing.map((n) => [n]),
  );
  log(
    `  [add] ${missing.length} partner types (${existing.length} existed)`,
  );
}

// ── 2. Partner Status Types ──

async function seedPartnerStatusTypes() {
  stepHeader("Seeding partner_status_type...");
  const existing = await d1Query<{ status_name: string }>(
    "SELECT status_name FROM partner_status_type",
  );
  const existingNames = new Set(existing.map((r) => r.status_name));
  const missing = PARTNER_STATUS_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) {
    log(`  [skip] all ${PARTNER_STATUS_TYPES.length} types exist`);
    return;
  }
  await d1BatchInsert(
    "partner_status_type",
    ["status_name"],
    missing.map((n) => [n]),
  );
  log(
    `  [add] ${missing.length} partner status types (${existing.length} existed)`,
  );
}

// ── 3. Enquiry Status Types ──

async function seedEnquiryStatusTypes() {
  stepHeader("Seeding enquiry_status_type...");
  const existing = await d1Query<{ status_name: string }>(
    "SELECT status_name FROM enquiry_status_type",
  );
  const existingNames = new Set(existing.map((r) => r.status_name));
  const missing = ENQUIRY_STATUS_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) {
    log(`  [skip] all ${ENQUIRY_STATUS_TYPES.length} types exist`);
    return;
  }
  await d1BatchInsert(
    "enquiry_status_type",
    ["status_name"],
    missing.map((n) => [n]),
  );
  log(
    `  [add] ${missing.length} enquiry status types (${existing.length} existed)`,
  );
}

// ── 4. Approval Status Types ──

async function seedApprovalStatusTypes() {
  stepHeader("Seeding approval_status_type...");
  const existing = await d1Query<{ status_name: string }>(
    "SELECT status_name FROM approval_status_type",
  );
  const existingNames = new Set(existing.map((r) => r.status_name));
  const missing = APPROVAL_STATUS_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) {
    log(`  [skip] all ${APPROVAL_STATUS_TYPES.length} types exist`);
    return;
  }
  await d1BatchInsert(
    "approval_status_type",
    ["status_name"],
    missing.map((n) => [n]),
  );
  log(
    `  [add] ${missing.length} approval status types (${existing.length} existed)`,
  );
}

// ── 5. Article Status Types ──

async function seedArticleStatusTypes() {
  stepHeader("Seeding article_status_type...");
  const existing = await d1Query<{ status_name: string }>(
    "SELECT status_name FROM article_status_type",
  );
  const existingNames = new Set(existing.map((r) => r.status_name));
  const missing = ARTICLE_STATUS_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) {
    log(`  [skip] all ${ARTICLE_STATUS_TYPES.length} types exist`);
    return;
  }
  await d1BatchInsert(
    "article_status_type",
    ["status_name"],
    missing.map((n) => [n]),
  );
  log(
    `  [add] ${missing.length} article status types (${existing.length} existed)`,
  );
}

// ── 6. Condition Types ──

async function seedConditionTypes() {
  stepHeader("Seeding condition_type...");
  const existing = await d1Query<{ name: string }>(
    "SELECT name FROM condition_type",
  );
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = CONDITION_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) {
    log(`  [skip] all ${CONDITION_TYPES.length} types exist`);
    return;
  }
  await d1BatchInsert(
    "condition_type",
    ["name"],
    missing.map((n) => [n]),
  );
  log(
    `  [add] ${missing.length} condition types (${existing.length} existed)`,
  );
}

// ── 7. App Users ──

async function seedAppUsers(): Promise<number[]> {
  stepHeader("Seeding app_user (50 users)...");
  const existing = await d1Query<{ app_user_id: number }>(
    "SELECT app_user_id FROM app_user",
  );
  if (existing.length >= 50) {
    log(`  [skip] ${existing.length} users exist`);
    return existing.map((c) => c.app_user_id);
  }

  const businessTypes = await d1Query<{ business_type_id: number }>(
    "SELECT business_type_id FROM business_type",
  );
  const btIds = businessTypes.map((b) => b.business_type_id);

  const passwordHash = await bcrypt.hash("customer123!", BCRYPT_ROUNDS);
  log(`  Hashed shared user password`);

  const existingEmails = new Set(
    (
      await d1Query<{ email: string }>("SELECT email FROM app_user")
    ).map((r) => r.email),
  );

  const allFirstNames = [...FIRST_NAMES_MALE, ...FIRST_NAMES_FEMALE];
  const usedUsernames = new Set<string>();
  const appUserIds: number[] = [...existing.map((c) => c.app_user_id)];
  const toInsert = 50 - existing.length;

  let inserted = 0;
  let attempt = 0;

  while (inserted < toInsert && attempt < 200) {
    attempt++;
    const firstName = randomItem(allFirstNames);
    const lastPart = randomItem(LAST_NAME_PARTS);
    const username = `${firstName.toLowerCase()}_${lastPart.toLowerCase()}${randomInt(1, 99)}`;

    if (usedUsernames.has(username)) continue;
    usedUsernames.add(username);

    const email = `${username}@example.com`;
    if (existingEmails.has(email)) continue;
    existingEmails.add(email);

    const phone = generateMyanmarPhone();
    const isVerified = randomInt(0, 1);
    const companyName =
      randomInt(0, 1) === 1 ? randomItem(COMPANY_NAMES) : null;
    const officeAddress = companyName ? randomItem(OFFICE_ADDRESSES) : null;
    const businessTypeId = btIds.length > 0 ? randomItem(btIds) : null;

    await d1Execute(
      `INSERT INTO app_user (username, email, password_hash, phone, is_verified, company_name, office_address, business_type_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        email,
        passwordHash,
        phone,
        isVerified,
        companyName,
        officeAddress,
        businessTypeId,
      ],
    );

    const [user] = await d1Query<{ app_user_id: number }>(
      "SELECT app_user_id FROM app_user WHERE email = ?",
      [email],
    );
    appUserIds.push(user.app_user_id);
    inserted++;
  }

  log(`  [add] ${inserted} users (${appUserIds.length} total)`);
  return appUserIds;
}

// ── 8. Partners ──

async function seedPartners(appUserIds: number[]): Promise<number[]> {
  stepHeader("Seeding partner (20 approved + 30 pending)...");
  const existingPartners = await d1Query<{ id: number }>(
    "SELECT id FROM partner",
  );
  if (existingPartners.length >= 50) {
    log(`  [skip] ${existingPartners.length} partners exist`);
    const approved = await d1Query<{ id: number }>(
      "SELECT p.id FROM partner p JOIN partner_status_type pst ON p.status_id = pst.id WHERE pst.status_name = 'Approved'",
    );
    return approved.map((p) => p.id);
  }

  const partnerTypes = await d1Query<{ id: number }>(
    "SELECT id FROM partner_type",
  );
  const statuses = await d1Query<{ id: number; status_name: string }>(
    "SELECT id, status_name FROM partner_status_type",
  );
  const approvedStatusId = statuses.find(
    (s) => s.status_name === "Approved",
  )!.id;
  const pendingStatusId = statuses.find(
    (s) => s.status_name === "Pending",
  )!.id;

  const existingPartnerUsers = await d1Query<{ app_user_id: number }>(
    "SELECT app_user_id FROM partner",
  );
  const existingUserSet = new Set(
    existingPartnerUsers.map((p) => p.app_user_id),
  );
  const availableUsers = appUserIds.filter((id) => !existingUserSet.has(id));

  const shuffled = shuffle(availableUsers);
  const toCreate = Math.min(50 - existingPartners.length, shuffled.length);

  const approvedPartnerIds: number[] = [];

  for (let i = 0; i < toCreate; i++) {
    const userId = shuffled[i];
    const typeId = randomItem(partnerTypes).id;
    const statusId = i < 20 ? approvedStatusId : pendingStatusId;

    await d1Execute(
      `INSERT INTO partner (app_user_id, partner_type_id, status_id) VALUES (?, ?, ?)`,
      [userId, typeId, statusId],
    );

    if (statusId === approvedStatusId) {
      const [p] = await d1Query<{ id: number }>(
        "SELECT id FROM partner WHERE app_user_id = ?",
        [userId],
      );
      approvedPartnerIds.push(p.id);
    }
  }

  const allApproved = await d1Query<{ id: number }>(
    "SELECT p.id FROM partner p JOIN partner_status_type pst ON p.status_id = pst.id WHERE pst.status_name = 'Approved'",
  );

  log(
    `  [add] ${toCreate} partners (${Math.min(20, toCreate)} approved, ${Math.max(0, toCreate - 20)} pending)`,
  );
  return allApproved.map((p) => p.id);
}

// ── 9. Enquiries ──

async function seedEnquiries(appUserIds: number[]) {
  stepHeader("Seeding enquiry (100 enquiries)...");
  const count = await d1Count("enquiry");
  if (count > 0) {
    log(`  [skip] ${count} rows exist`);
    return;
  }

  const statuses = await d1Query<{ id: number; status_name: string }>(
    "SELECT id, status_name FROM enquiry_status_type",
  );
  const pendingId = statuses.find((s) => s.status_name === "Pending")!.id;
  const resolvedId = statuses.find((s) => s.status_name === "Resolved")!.id;

  const saleListings = await d1Query<{ id: number }>(
    "SELECT id FROM sale_listing LIMIT 50",
  );
  const rentListings = await d1Query<{ id: number }>(
    "SELECT id FROM rent_listing LIMIT 50",
  );
  const saleIds = saleListings.map((s) => s.id);
  const rentIds = rentListings.map((r) => r.id);

  if (saleIds.length === 0 && rentIds.length === 0) {
    log(`  [warn] No listings found. Skipping enquiries.`);
    return;
  }

  const rows: unknown[][] = [];
  for (let i = 0; i < 100; i++) {
    const appUserId = appUserIds.length > 0 ? randomItem(appUserIds) : null;
    const message = ENQUIRY_MESSAGES[i % ENQUIRY_MESSAGES.length];
    const statusId = i < 65 ? pendingId : resolvedId;

    let saleId: number | null = null;
    let rentId: number | null = null;

    if (i % 2 === 0 && saleIds.length > 0) {
      saleId = randomItem(saleIds);
    } else if (rentIds.length > 0) {
      rentId = randomItem(rentIds);
    } else if (saleIds.length > 0) {
      saleId = randomItem(saleIds);
    }

    rows.push([saleId, rentId, appUserId, message, statusId]);
  }

  await d1BatchInsert(
    "enquiry",
    [
      "sale_listing_id",
      "rent_listing_id",
      "app_user_id",
      "message",
      "enquiry_status_id",
    ],
    rows,
    10,
  );
  log(`  [add] 100 enquiries (65 pending, 35 resolved)`);
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  SHWELOADER — LOOKUP TABLES + SAMPLE DATA SEED");
  console.log("══════════════════════════════════════════════════");
  console.log(`  D1 API: ${D1_BASE_URL}\n`);

  if (!D1_API_TOKEN) {
    console.error("  ERROR: CLOUDFLARE_WORKER_API_TOKEN is not set.");
    console.error(
      "  Run with: pnpm tsx --env-file=.env.local scripts/seed-lookup-tables.ts",
    );
    process.exit(1);
  }

  // Part 1: Lookup tables (no dependencies)
  await seedPartnerTypes();
  await seedPartnerStatusTypes();
  await seedEnquiryStatusTypes();
  await seedApprovalStatusTypes();
  await seedArticleStatusTypes();
  await seedConditionTypes();

  // Part 2: Mobile-app-originated data (depends on lookup tables)
  const appUserIds = await seedAppUsers();
  await seedPartners(appUserIds);
  await seedEnquiries(appUserIds);

  console.log("\n══════════════════════════════════════════════════");
  console.log("  Done!");
  console.log("══════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
