/**
 * Seed script: inserts lookup data + 4 product listings (3 sale, 1 rent)
 * into the staging D1 database via the Cloudflare Worker REST proxy.
 *
 * Run:  npx tsx scripts/seed-listings.ts
 */

const BASE_URL = process.env.CLOUDFLARE_WORKER_API_URL ?? "https://api.staging.shweloader.com.mm";
const TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN;

if (!TOKEN) {
  console.error("Missing CLOUDFLARE_WORKER_API_TOKEN environment variable.");
  console.error("Set it in .env.local or pass it inline: CLOUDFLARE_WORKER_API_TOKEN=xxx npx tsx scripts/seed-listings.ts");
  process.exit(1);
}

async function query(sql: string, params?: unknown[]) {
  const body: { query: string; params?: unknown[] } = { query: sql };
  if (params) body.params = params;

  const res = await fetch(`${BASE_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    console.error("SQL Error:", sql);
    console.error("Response:", JSON.stringify(data, null, 2));
    throw new Error(data.error || `Query failed (${res.status})`);
  }
  return data;
}

async function getOrInsert(
  table: string,
  nameCol: string,
  name: string,
  idCol: string,
  extra?: Record<string, unknown>,
): Promise<number> {
  // Check if it exists (simple query without deleted_at — works for all tables)
  const existing = await query(
    `SELECT ${idCol} FROM ${table} WHERE ${nameCol} = ? LIMIT 1`,
    [name],
  );
  if (existing.results?.length > 0) {
    const id = existing.results[0][idCol];
    console.log(`  [exists] ${table}.${nameCol} = "${name}" → ${idCol}=${id}`);
    return id;
  }

  // Insert
  const cols = [nameCol, ...(extra ? Object.keys(extra) : [])];
  const vals = [name, ...(extra ? Object.values(extra) : [])];
  const placeholders = cols.map(() => "?").join(", ");

  const insertResult = await query(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) RETURNING ${idCol}`,
    vals,
  );
  const id = insertResult.results[0][idCol];
  console.log(`  [created] ${table}.${nameCol} = "${name}" → ${idCol}=${id}`);
  return id;
}

async function main() {
  console.log("=== Seeding lookup data ===\n");

  // 1. Condition types (for sale listings)
  console.log("Condition types:");
  const conditionNew = await getOrInsert("condition_type", "name", "New", "id");
  const conditionUsed = await getOrInsert("condition_type", "name", "Used", "id");

  // 2. Approval status types
  console.log("\nApproval status types:");
  const approvedStatusId = await getOrInsert("approval_status_type", "status_name", "Approved", "id");
  await getOrInsert("approval_status_type", "status_name", "Pending", "id");

  // 3. Brands
  console.log("\nBrands:");
  const brandCat = await getOrInsert("product_brand", "name", "Caterpillar", "brand_id", { created_by: 1 });
  const brandKomatsu = await getOrInsert("product_brand", "name", "Komatsu", "brand_id", { created_by: 1 });

  // 4. Equipment main category
  console.log("\nEquipment main categories:");
  const mainCatId = await getOrInsert("equipment_main_category", "name", "Earthmoving", "category_id", {
    created_by: 1,
    display_order: "a0",
  });

  // 5. Equipment sub category
  console.log("\nEquipment sub categories:");
  const subCatExcavator = await getOrInsert("equipment_sub_category", "name", "Excavator", "sub_category_id", {
    category_id: mainCatId,
    created_by: 1,
    display_order: "a0",
  });
  const subCatBulldozer = await getOrInsert("equipment_sub_category", "name", "Bulldozer", "sub_category_id", {
    category_id: mainCatId,
    created_by: 1,
    display_order: "a1",
  });

  // 6. Link brands to sub categories
  console.log("\nSub category brands:");
  for (const [subId, brandId] of [
    [subCatExcavator, brandCat],
    [subCatExcavator, brandKomatsu],
    [subCatBulldozer, brandCat],
  ]) {
    const exists = await query(
      "SELECT id FROM equipment_sub_category_brand WHERE sub_category_id = ? AND brand_id = ?",
      [subId, brandId],
    );
    if (exists.results?.length === 0) {
      await query(
        "INSERT INTO equipment_sub_category_brand (sub_category_id, brand_id, created_by) VALUES (?, ?, 1)",
        [subId, brandId],
      );
      console.log(`  [created] sub_category_brand: sub=${subId}, brand=${brandId}`);
    } else {
      console.log(`  [exists] sub_category_brand: sub=${subId}, brand=${brandId}`);
    }
  }

  // 7. Equipment models
  console.log("\nEquipment models:");
  const model320 = await getOrInsert("equipment_model", "name", "CAT 320 GC", "model_id", {
    brand_id: brandCat,
    sub_category_id: subCatExcavator,
    created_by: 1,
  });
  const modelPC200 = await getOrInsert("equipment_model", "name", "Komatsu PC200-8", "model_id", {
    brand_id: brandKomatsu,
    sub_category_id: subCatExcavator,
    created_by: 1,
  });
  const modelD6 = await getOrInsert("equipment_model", "name", "CAT D6 XE", "model_id", {
    brand_id: brandCat,
    sub_category_id: subCatBulldozer,
    created_by: 1,
  });
  const modelPC130 = await getOrInsert("equipment_model", "name", "Komatsu PC130-8", "model_id", {
    brand_id: brandKomatsu,
    sub_category_id: subCatExcavator,
    created_by: 1,
  });

  // 8. Check for a partner (use existing or skip)
  console.log("\nPartner:");
  const partnerResult = await query(
    "SELECT id FROM partner WHERE deleted_at IS NULL LIMIT 1",
  );
  let partnerId: number | null = null;
  if (partnerResult.results?.length > 0) {
    partnerId = partnerResult.results[0].id;
    console.log(`  [exists] partner id=${partnerId}`);
  } else {
    console.log("  [skip] No partner found — listings will have partner_id=NULL");
  }

  // === Create product_list + sale_listing / rent_listing ===
  console.log("\n=== Seeding product listings ===\n");

  const now = new Date().toISOString().replace("T", " ").slice(0, 19);

  // Helper: create product_list → sale or rent listing
  async function createListing(opts: {
    modelId: number;
    type: "sale" | "rent";
    mmkPrice: number;
    usdPrice: number;
    conditionId?: number;
    description: string;
    displayOrder: string;
  }) {
    // Create product_list
    const plResult = await query(
      `INSERT INTO product_list (partner_id, equipment_model_id, description, is_draft, created_by, created_at, updated_at)
       VALUES (?, ?, ?, 0, 1, ?, ?) RETURNING id`,
      [partnerId, opts.modelId, opts.description, now, now],
    );
    const plId = plResult.results[0].id;
    console.log(`  product_list id=${plId}`);

    if (opts.type === "sale") {
      const slResult = await query(
        `INSERT INTO sale_listing (product_list_id, condition_type_id, mmk_price, usd_price, display_currency, is_hidden, is_sold_out, approve_status_id, approved_by, approved_at, created_by, created_at, updated_at, display_order)
         VALUES (?, ?, ?, ?, 'MMK', 0, 0, ?, 1, ?, 1, ?, ?, ?) RETURNING id`,
        [plId, opts.conditionId ?? null, opts.mmkPrice, opts.usdPrice, approvedStatusId, now, now, now, opts.displayOrder],
      );
      const slId = slResult.results[0].id;
      console.log(`  sale_listing id=${slId} ✓`);
    } else {
      const rlResult = await query(
        `INSERT INTO rent_listing (product_list_id, mmk_price, usd_price, display_currency, is_hidden, is_rented, approve_status_id, approved_by, approved_at, created_by, created_at, updated_at, display_order)
         VALUES (?, ?, ?, 'MMK', 0, 0, ?, 1, ?, 1, ?, ?, ?) RETURNING id`,
        [plId, opts.mmkPrice, opts.usdPrice, approvedStatusId, now, now, now, opts.displayOrder],
      );
      const rlId = rlResult.results[0].id;
      console.log(`  rent_listing id=${rlId} ✓`);
    }
  }

  // Sale listing 1: CAT 320 GC
  console.log("Listing 1: CAT 320 GC (Sale, New)");
  await createListing({
    modelId: model320,
    type: "sale",
    mmkPrice: 850000000,
    usdPrice: 320000,
    conditionId: conditionNew,
    description: "Brand new CAT 320 GC Hydraulic Excavator. 22-ton class, Tier 4 Final engine. Full warranty.",
    displayOrder: "a0",
  });

  // Sale listing 2: Komatsu PC200-8
  console.log("Listing 2: Komatsu PC200-8 (Sale, Used)");
  await createListing({
    modelId: modelPC200,
    type: "sale",
    mmkPrice: 420000000,
    usdPrice: 158000,
    conditionId: conditionUsed,
    description: "Well-maintained Komatsu PC200-8 excavator. 5,200 hours, serviced regularly. Ready for work.",
    displayOrder: "a1",
  });

  // Sale listing 3: CAT D6 XE
  console.log("Listing 3: CAT D6 XE (Sale, New)");
  await createListing({
    modelId: modelD6,
    type: "sale",
    mmkPrice: 1200000000,
    usdPrice: 450000,
    conditionId: conditionNew,
    description: "CAT D6 XE electric drive bulldozer. Latest model with improved fuel efficiency.",
    displayOrder: "a2",
  });

  // Rent listing 1: Komatsu PC130-8
  console.log("Listing 4: Komatsu PC130-8 (Rent)");
  await createListing({
    modelId: modelPC130,
    type: "rent",
    mmkPrice: 5000000,
    usdPrice: 1900,
    description: "Komatsu PC130-8 available for monthly rental. Includes operator option. Minimum 1 month.",
    displayOrder: "a0",
  });

  console.log("\n=== Seeding complete! ===");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
