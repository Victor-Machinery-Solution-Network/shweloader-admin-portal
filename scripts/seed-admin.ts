/**
 * Seed script: Bootstrap everything needed before the portal is usable
 *
 * Seeds (in order):
 *   1. Lookup/type tables (partner_type, status types)
 *   2. RBAC (permissions → features → feature_permissions)
 *   3. Super Admin role + role_permissions
 *   4. Bootstrap admin user
 *   5. Carousel container + app settings
 *   6. Locations (state/region → district → township)
 *
 * Idempotent: skips records that already exist.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/seed-admin.ts
 *
 * Requires CLOUDFLARE_WORKER_API_TOKEN and CLOUDFLARE_WORKER_API_URL in .env.local
 */

import bcrypt from "bcryptjs";

// ─── Configuration ──────────────────────────────────────────────────────────

const ADMIN_EMAIL = "admin@shweloader.com";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123!"; // Change this after first login
const BCRYPT_ROUNDS = 12;

const D1_BASE_URL =
  process.env.CLOUDFLARE_WORKER_API_URL ||
  "https://api.staging.shweloader.com.mm";
const D1_API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";

// ─── D1 Helpers ─────────────────────────────────────────────────────────────

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

// ─── Lookup / Type Data ─────────────────────────────────────────────────────

const PARTNER_TYPES = ["Dealer", "Rental Company", "Individual Seller"];
const PARTNER_STATUS_TYPES = ["Pending", "Approved", "Rejected"];
const ENQUIRY_STATUS_TYPES = ["Pending", "Resolved", "Replied"];
const APPROVAL_STATUS_TYPES = ["Pending", "Approved", "Rework"];
const ARTICLE_STATUS_TYPES = [
  "Draft",
  "Pending Review",
  "Published",
  "Hidden",
  "Rework",
];

// ─── Myanmar Location Hierarchy: State/Region → District → Townships ────────

const MYANMAR_LOCATIONS: Record<string, { type: "state" | "region" | "union_territory"; districts: Record<string, string[]> }> = {
  // 7 States
  "Chin State": {
    type: "state",
    districts: {
      "Falam District": ["Falam", "Tiddim", "Ton Zang", "Reed"],
      "Hakha District": ["Hakha", "Thantlang", "Htantlang"],
      "Mindat District": ["Mindat", "Matupi", "Kanpetlet"],
      "Paletwa District": ["Paletwa"],
    },
  },
  "Kachin State": {
    type: "state",
    districts: {
      "Bhamo District": ["Bhamo", "Shwegu", "Momauk", "Mansi"],
      "Mohnyin District": ["Mohnyin", "Mogaung", "Phakant", "Hopin"],
      "Myitkyina District": ["Myitkyina", "Waingmaw", "Injangyang", "Tanai", "Chipwi", "Tsawlaw"],
      "Putao District": ["Putao", "Sumprabum", "Machanbaw", "Nawngmun", "Khaunglanhpu"],
    },
  },
  "Kayah State": {
    type: "state",
    districts: {
      "Bawlakhe District": ["Bawlakhe", "Hpasawng", "Mese"],
      "Loikaw District": ["Loikaw", "Demoso", "Hpruso", "Shadaw"],
    },
  },
  "Kayin State": {
    type: "state",
    districts: {
      "Hpa-an District": ["Hpa-an", "Hlaingbwe", "Paingkyon", "Shan Ywa Thit"],
      "Kawkareik District": ["Kawkareik", "Kyainseikgyi", "Kyondo"],
      "Myawaddy District": ["Myawaddy"],
      "Papun District": ["Papun", "Thandaunggyi"],
    },
  },
  "Mon State": {
    type: "state",
    districts: {
      "Mawlamyine District": ["Mawlamyine", "Kyaikmaraw", "Chaungzon", "Thanbyuzayat", "Mudon", "Ye", "Lamine", "Khawzar"],
      "Thaton District": ["Thaton", "Paung", "Bilin", "Kyaikhto"],
    },
  },
  "Rakhine State": {
    type: "state",
    districts: {
      "Kyaukpyu District": ["Kyaukpyu", "Manaung", "Ann", "Ramree"],
      "Maungdaw District": ["Maungdaw", "Buthidaung"],
      "Sittwe District": ["Sittwe", "Pauktaw", "Ponnagyun", "Rathedaung"],
      "Thandwe District": ["Thandwe", "Toungup", "Gwa", "Gya"],
      "Mrauk-U District": ["Mrauk-U", "Kyauktaw", "Minbya", "Myebon"],
    },
  },
  "Shan State": {
    type: "state",
    districts: {
      "Kengtung District": ["Kengtung", "Mong Khet", "Mong Yang", "Mong La"],
      "Kunlong District": ["Kunlong", "Chin Shwe Haw"],
      "Kyaukme District": ["Kyaukme", "Hsipaw", "Namtu", "Nawnghkio", "Mantong", "Namhsan"],
      "Lashio District": ["Lashio", "Theinni", "Tangyan", "Mongyai"],
      "Laukkaing District": ["Laukkaing", "Konkyan"],
      "Loilen District": ["Loilen", "Panglong", "Kunhing", "Kali", "Namsang", "Mongnai"],
      "Muse District": ["Muse", "Namhkam", "Kutkai"],
      "Tachileik District": ["Tachileik", "Mongsat", "Mongping", "Mongyawng", "Mongton", "Monghsat"],
      "Taunggyi District": ["Taunggyi", "Nyaungshwe", "Hopong", "Hsihseng", "Kalaw", "Lawksawk", "Pinlaung", "Pekon", "Ywangan", "Pindaya"],
      "Wa SAZ": ["Hopang", "Mongmao", "Panwai", "Nahphan", "Metman"],
      "Mong Hsu District": ["Mong Hsu", "Mong Kung"],
      "Langkho District": ["Langkho", "Mawkmai", "Mongshu"],
    },
  },
  // 7 Regions
  "Ayeyarwady Region": {
    type: "region",
    districts: {
      "Hinthada District": ["Hinthada", "Lemyethna", "Zalun", "Ingapu", "Myanaung", "Kyangin"],
      "Labutta District": ["Labutta", "Mawlamyinegyun"],
      "Myaungmya District": ["Myaungmya", "Einme", "Wakema"],
      "Pathein District": ["Pathein", "Kangyidaunt", "Ngapudaw", "Thabaung", "Kyonpyaw", "Kyaunggon", "Yekyi", "Hainggyikyun"],
      "Phyarpon District": ["Phyarpon", "Bogale", "Dedaye"],
      "Maubin District": ["Maubin", "Pantanaw", "Nyaungdon", "Danubyu"],
    },
  },
  "Bago Region": {
    type: "region",
    districts: {
      "Bago District": ["Bago", "Daik-U", "Kawa", "Thanatpin", "Waw", "Nyaunglebin", "Kyauktaga", "Shwegyin"],
      "Pyay District": ["Pyay", "Paukkhaung", "Padaung", "Paungde", "Thegon", "Shwedaung"],
      "Taungoo District": ["Taungoo", "Yedashe", "Kyaukkyi", "Oktwin", "Pyu", "Htantabin", "Phyu"],
      "Thayarwady District": ["Thayarwady", "Letpadan", "Minhla", "Monyo", "Okpho", "Gyobingauk", "Nattalin", "Zigon"],
    },
  },
  "Magway Region": {
    type: "region",
    districts: {
      "Gangaw District": ["Gangaw", "Tilin", "Saw"],
      "Magway District": ["Magway", "Natmauk", "Taungdwingyi", "Myothit"],
      "Minbu District": ["Minbu", "Pwintbyu", "Ngape", "Salin", "Sidoktaya"],
      "Pakokku District": ["Pakokku", "Yesagyo", "Myaing", "Pauk"],
      "Thayet District": ["Thayet", "Aunglan", "Kamma", "Minhla", "Sinbaungwe"],
    },
  },
  "Mandalay Region": {
    type: "region",
    districts: {
      "Kyaukse District": ["Kyaukse", "Myittha", "Sintgaing", "Tada-U"],
      "Mandalay District": ["Aungmyaythazan", "Chanayethazan", "Chanmyathazi", "Mahaaungmyay", "Pyigyidagon", "Amarapura", "Patheingyi"],
      "Meiktila District": ["Meiktila", "Mahlaing", "Thazi", "Wundwin"],
      "Myingyan District": ["Myingyan", "Natogyi", "Ngazun", "Taungtha", "Kyaukpadaung"],
      "NyaungU District": ["NyaungU", "Ngathayouk"],
      "Pyinoolwin District": ["Pyin Oo Lwin", "Madaya", "Mogoke", "Singu", "Thabeikkyin"],
      "Yamethin District": ["Yamethin", "Pyawbwe"],
    },
  },
  "Sagaing Region": {
    type: "region",
    districts: {
      "Hkamti District": ["Hkamti", "Homalin", "Leshi", "Lahe", "Nanyun"],
      "Kanbalu District": ["Kanbalu", "Kyunhla", "Ye-U"],
      "Katha District": ["Katha", "Indaw", "Tigyaing", "Banmauk", "Kawlin", "Wuntho", "Pinlebu"],
      "Kalay District": ["Kalay", "Kalewa", "Mingin"],
      "Mawlaik District": ["Mawlaik", "Paungbyin"],
      "Monywa District": ["Monywa", "Budalin", "Ayadaw", "Chaung-U"],
      "Sagaing District": ["Sagaing", "Myinmu", "Myaung"],
      "Shwebo District": ["Shwebo", "Wetlet", "Khin-U", "Tabayin", "Depayin"],
      "Tamu District": ["Tamu"],
      "Yinmabin District": ["Yinmabin", "Salingyi", "Pale", "Kani"],
    },
  },
  "Tanintharyi Region": {
    type: "region",
    districts: {
      "Dawei District": ["Dawei", "Launglon", "Thayetchaung", "Yebyu"],
      "Kawthaung District": ["Kawthaung", "Bokpyin"],
      "Myeik District": ["Myeik", "Tanintharyi", "Palaw", "Kyunsu"],
    },
  },
  "Yangon Region": {
    type: "region",
    districts: {
      "Yangon East District": ["Botataung", "Dagon Seikkan", "Dawbon", "East Dagon", "Mingala Taungnyunt", "North Dagon", "North Okkalapa", "Pazundaung", "South Dagon", "South Okkalapa", "Tamwe", "Thaketa", "Thingangyun", "Yankin"],
      "Yangon West District": ["Ahlon", "Bahan", "Dagon", "Hlaing", "Kamayut", "Kyauktada", "Kyimyindaing", "Lanmadaw", "Latha", "Mayangon", "Pabedan", "Sanchaung", "Seikkan"],
      "Yangon South District": ["Cocokyun", "Dala", "Kawhmu", "Kungyangon", "Seikkyi Kanaungto", "Twante"],
      "Yangon North District": ["Hlaingthaya", "Hmawbi", "Htantabin", "Insein", "Mingaladon", "Shwepyitha", "Taikkyi", "Hlegu", "Thanlyin"],
    },
  },
  // Union Territory
  "Naypyidaw Union Territory": {
    type: "union_territory",
    districts: {
      "Ottara District": ["Ottarathiri", "Pobbathiri", "Tatkon", "Pyinmana"],
      "Dekkhinathiri District": ["Dekkhinathiri", "Zabuthiri", "Lewe", "Zeyathiri"],
    },
  },
};

const APP_SETTINGS = [
  { setting_key: "carousel_enabled", value: "true" },
  { setting_key: "announcement_bar_enabled", value: "true" },
  { setting_key: "articles_enabled", value: "true" },
  { setting_key: "exchange_rate", value: "3200" },
];

// ─── RBAC Data ──────────────────────────────────────────────────────────────

const PERMISSIONS = [
  { name: "read", display_order: 1 },
  { name: "create", display_order: 2 },
  { name: "edit", display_order: 3 },
  { name: "delete", display_order: 4 },
  { name: "approve", display_order: 5 },
  { name: "restore", display_order: 6 },
];

const FEATURES = [
  // Dashboard (1–2)
  { name: "dashboard", group_name: "Dashboard", display_order: 1 },
  { name: "analytics", group_name: "Dashboard", display_order: 2 },
  // Catalog (3–9)
  { name: "equipment_main_categories", group_name: "Catalog", display_order: 3 },
  { name: "equipment_sub_categories", group_name: "Catalog", display_order: 4 },
  { name: "equipment_models", group_name: "Catalog", display_order: 5 },
  { name: "attachment_categories", group_name: "Catalog", display_order: 6 },
  { name: "attachment_models", group_name: "Catalog", display_order: 7 },
  { name: "brands", group_name: "Catalog", display_order: 8 },
  { name: "locations", group_name: "Catalog", display_order: 9 },
  // Marketplace (10–16)
  { name: "sale_listings", group_name: "Marketplace", display_order: 10 },
  { name: "rent_listings", group_name: "Marketplace", display_order: 11 },
  { name: "featured_listings", group_name: "Marketplace", display_order: 12 },
  { name: "enquiries", group_name: "Marketplace", display_order: 13 },
  { name: "chat", group_name: "Marketplace", display_order: 14 },
  { name: "listing_templates", group_name: "Marketplace", display_order: 15 },
  { name: "condition_types", group_name: "Marketplace", display_order: 16 },
  // Users (17–20)
  { name: "users", group_name: "Users", display_order: 17 },
  { name: "partners", group_name: "Users", display_order: 18 },
  { name: "business_types", group_name: "Users", display_order: 19 },
  { name: "blacklist", group_name: "Users", display_order: 20 },
  // Content (21–24)
  { name: "articles", group_name: "Content", display_order: 21 },
  { name: "article_categories", group_name: "Content", display_order: 22 },
  { name: "announcements", group_name: "Content", display_order: 23 },
  { name: "carousels", group_name: "Content", display_order: 24 },
  // Administration (25–28)
  { name: "admin_users", group_name: "Administration", display_order: 25 },
  { name: "roles", group_name: "Administration", display_order: 26 },
  { name: "app_settings", group_name: "Administration", display_order: 27 },
  { name: "trash", group_name: "Administration", display_order: 28 },
];

const FEATURE_PERMISSION_MAP: Record<string, string[]> = {
  dashboard: ["read"],
  analytics: ["read"],
  sale_listings: ["create", "read", "edit", "delete", "approve"],
  rent_listings: ["create", "read", "edit", "delete", "approve"],
  featured_listings: ["create", "read", "delete"],
  condition_types: ["create", "read", "edit", "delete"],
  enquiries: ["read", "edit", "delete"],
  chat: ["read", "edit"],
  users: ["read", "create"],
  partners: ["read", "approve"],
  blacklist: ["read", "create", "delete"],
  articles: ["create", "read", "edit", "delete", "approve"],
  app_settings: ["read", "edit"],
  trash: ["read", "restore", "delete"],
};

const DEFAULT_PERMS = ["create", "read", "edit", "delete"];

// ─── Main ───────────────────────────────────────────────────────────────────

async function seedAdmin() {
  console.log("\n══════════════════════════════════════════════════");
  console.log("  SHWELOADER — ADMIN BOOTSTRAP SEED");
  console.log("══════════════════════════════════════════════════");
  console.log(`  D1 API: ${D1_BASE_URL}\n`);

  if (!D1_API_TOKEN) {
    console.error("  ERROR: CLOUDFLARE_WORKER_API_TOKEN is not set.");
    console.error(
      "  Run with: pnpm tsx --env-file=.env.local scripts/seed-admin.ts",
    );
    process.exit(1);
  }

  // ── 1. Seed lookup/type tables ───────────────────────────────────────────
  console.log("1. Seeding lookup/type tables...");

  const lookupTables: { table: string; column: string; values: string[] }[] = [
    { table: "partner_type", column: "name", values: PARTNER_TYPES },
    { table: "partner_status_type", column: "status_name", values: PARTNER_STATUS_TYPES },
    { table: "enquiry_status_type", column: "status_name", values: ENQUIRY_STATUS_TYPES },
    { table: "approval_status_type", column: "status_name", values: APPROVAL_STATUS_TYPES },
    { table: "article_status_type", column: "status_name", values: ARTICLE_STATUS_TYPES },
  ];

  for (const { table, column, values } of lookupTables) {
    const existing = await d1Query<Record<string, string>>(
      `SELECT ${column} FROM ${table}`,
    );
    const existingSet = new Set(existing.map((r) => r[column]));
    let added = 0;
    for (const val of values) {
      if (existingSet.has(val)) continue;
      await d1Execute(`INSERT INTO ${table} (${column}) VALUES (?)`, [val]);
      added++;
    }
    console.log(`   ${table}: ${added} added, ${existingSet.size} existed`);
  }

  // ── 2. Seed permissions ─────────────────────────────────────────────────
  console.log("2. Seeding permissions...");
  const existingPerms = await d1Query<{ name: string }>(
    "SELECT name FROM permission",
  );
  const existingPermNames = new Set(existingPerms.map((r) => r.name));
  let addedPerms = 0;
  for (const perm of PERMISSIONS) {
    if (existingPermNames.has(perm.name)) continue;
    await d1Execute(
      "INSERT INTO permission (name, display_order) VALUES (?, ?)",
      [perm.name, perm.display_order],
    );
    addedPerms++;
  }
  console.log(
    `   ${addedPerms} added, ${existingPermNames.size} already existed`,
  );

  // ── 3. Seed features ────────────────────────────────────────────────────
  console.log("3. Seeding features...");
  const existingFeats = await d1Query<{ name: string }>(
    "SELECT name FROM feature",
  );
  const existingFeatNames = new Set(existingFeats.map((r) => r.name));
  let addedFeats = 0;
  for (const feat of FEATURES) {
    if (existingFeatNames.has(feat.name)) continue;
    await d1Execute(
      "INSERT INTO feature (name, group_name, display_order) VALUES (?, ?, ?)",
      [feat.name, feat.group_name, feat.display_order],
    );
    addedFeats++;
  }
  console.log(
    `   ${addedFeats} added, ${existingFeatNames.size} already existed`,
  );

  // ── 4. Seed feature_permissions ─────────────────────────────────────────
  console.log("4. Seeding feature_permissions...");
  const features = await d1Query<{ feature_id: number; name: string }>(
    "SELECT feature_id, name FROM feature",
  );
  const permissions = await d1Query<{ permission_id: number; name: string }>(
    "SELECT permission_id, name FROM permission",
  );
  const existingFP = await d1Query<{
    feature_id: number;
    permission_id: number;
  }>("SELECT feature_id, permission_id FROM feature_permission");

  const featureMap = new Map(features.map((f) => [f.name, f.feature_id]));
  const permMap = new Map(permissions.map((p) => [p.name, p.permission_id]));
  const existingFPSet = new Set(
    existingFP.map((e) => `${e.feature_id}:${e.permission_id}`),
  );

  let addedFP = 0;
  for (const feat of FEATURES) {
    const fid = featureMap.get(feat.name);
    if (!fid) continue;
    const perms = FEATURE_PERMISSION_MAP[feat.name] ?? DEFAULT_PERMS;
    for (const permName of perms) {
      const pid = permMap.get(permName);
      if (!pid || existingFPSet.has(`${fid}:${pid}`)) continue;
      await d1Execute(
        "INSERT INTO feature_permission (feature_id, permission_id) VALUES (?, ?)",
        [fid, pid],
      );
      addedFP++;
    }
  }
  console.log(`   ${addedFP} added, ${existingFP.length} already existed`);

  // ── 5. Create Super Admin role ──────────────────────────────────────────
  console.log("5. Creating Super Admin role...");
  const existingRole = await d1Query<{ role_id: number }>(
    "SELECT role_id FROM role WHERE name = ?",
    ["Super Admin"],
  );

  let superAdminRoleId: number;
  if (existingRole.length > 0) {
    superAdminRoleId = existingRole[0].role_id;
    console.log(`   Already exists (role_id: ${superAdminRoleId})`);
  } else {
    await d1Execute(
      "INSERT INTO role (name, description, created_by) VALUES (?, ?, NULL)",
      ["Super Admin", "Full access to all features and permissions"],
    );
    const [inserted] = await d1Query<{ role_id: number }>(
      "SELECT role_id FROM role WHERE name = ?",
      ["Super Admin"],
    );
    superAdminRoleId = inserted.role_id;
    console.log(`   Created (role_id: ${superAdminRoleId})`);
  }

  // ── 6. Assign all permissions to Super Admin ────────────────────────────
  console.log("6. Assigning all permissions to Super Admin...");
  const allFP = await d1Query<{ feature_permission_id: number }>(
    "SELECT feature_permission_id FROM feature_permission",
  );
  const existingRP = await d1Query<{ feature_permission_id: number }>(
    "SELECT feature_permission_id FROM role_permission WHERE role_id = ?",
    [superAdminRoleId],
  );
  const existingRPSet = new Set(
    existingRP.map((r) => r.feature_permission_id),
  );

  let addedRP = 0;
  for (const fp of allFP) {
    if (existingRPSet.has(fp.feature_permission_id)) continue;
    await d1Execute(
      "INSERT INTO role_permission (role_id, feature_permission_id, granted_by) VALUES (?, ?, NULL)",
      [superAdminRoleId, fp.feature_permission_id],
    );
    addedRP++;
  }
  console.log(
    `   ${addedRP} granted, ${existingRPSet.size} already existed (total: ${allFP.length})`,
  );

  // ── 7. Create admin user with Super Admin role ──────────────────────────
  console.log("7. Creating admin user...");
  const existingAdmin = await d1Query<{ user_id: number }>(
    "SELECT user_id FROM admin_user WHERE email = ?",
    [ADMIN_EMAIL],
  );

  if (existingAdmin.length > 0) {
    const adminId = existingAdmin[0].user_id;
    console.log(`   Already exists (user_id: ${adminId})`);

    // Ensure role_id is set even if admin was created without one
    await d1Execute("UPDATE admin_user SET role_id = ? WHERE user_id = ?", [
      superAdminRoleId,
      adminId,
    ]);
    console.log(`   Ensured role_id = ${superAdminRoleId}`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
    await d1Execute(
      "INSERT INTO admin_user (username, email, password_hash, role_id, active) VALUES (?, ?, ?, ?, 1)",
      [ADMIN_USERNAME, ADMIN_EMAIL, passwordHash, superAdminRoleId],
    );
    const [inserted] = await d1Query<{ user_id: number }>(
      "SELECT user_id FROM admin_user WHERE email = ?",
      [ADMIN_EMAIL],
    );
    console.log(`   Created (user_id: ${inserted.user_id})`);
  }

  // ── 8. Seed carousel container ──────────────────────────────────────────
  console.log("8. Seeding carousel...");
  const existingCarousel = await d1Query<{ carousel_id: number }>(
    "SELECT carousel_id FROM carousel LIMIT 1",
  );
  if (existingCarousel.length > 0) {
    console.log(`   Already exists (carousel_id: ${existingCarousel[0].carousel_id})`);
  } else {
    await d1Execute(
      "INSERT INTO carousel (name, description) VALUES (?, ?)",
      ["Main Homepage Carousel", "Primary carousel displayed on the homepage"],
    );
    console.log("   Created 'Main Homepage Carousel'");
  }

  // ── 9. Seed app settings ──────────────────────────────────────────────
  console.log("9. Seeding app_setting...");
  let addedSettings = 0;
  for (const s of APP_SETTINGS) {
    const existing = await d1Query<{ id: number }>(
      "SELECT id FROM app_setting WHERE setting_key = ?",
      [s.setting_key],
    );
    if (existing.length > 0) continue;
    await d1Execute(
      "INSERT INTO app_setting (setting_key, value) VALUES (?, ?)",
      [s.setting_key, s.value],
    );
    addedSettings++;
  }
  console.log(
    `   ${addedSettings} added, ${APP_SETTINGS.length - addedSettings} existed`,
  );

  // ── 10. Seed locations (State/Region → District → Township) ─────────────
  console.log("10. Seeding locations...");

  // 10a. State/Region
  const existingSR = await d1Query<{ name: string }>("SELECT name FROM state_region");
  const existingSRNames = new Set(existingSR.map((r) => r.name));
  let addedSR = 0;
  for (const [name, data] of Object.entries(MYANMAR_LOCATIONS)) {
    if (existingSRNames.has(name)) continue;
    await d1Execute(
      "INSERT INTO state_region (name, type, created_by) VALUES (?, ?, NULL)",
      [name, data.type],
    );
    addedSR++;
  }
  console.log(`   state_region: ${addedSR} added, ${existingSRNames.size} existed`);

  // Build state_region_id lookup
  const srRows = await d1Query<{ state_region_id: number; name: string }>(
    "SELECT state_region_id, name FROM state_region",
  );
  const srIdMap = new Map(srRows.map((r) => [r.name, r.state_region_id]));

  // 10b. Districts
  const existingDist = await d1Query<{ name: string; state_region_id: number }>(
    "SELECT name, state_region_id FROM district",
  );
  const existingDistKeys = new Set(existingDist.map((r) => `${r.state_region_id}:${r.name}`));
  let addedDist = 0;
  for (const [srName, srData] of Object.entries(MYANMAR_LOCATIONS)) {
    const srId = srIdMap.get(srName);
    if (!srId) continue;
    for (const distName of Object.keys(srData.districts)) {
      if (existingDistKeys.has(`${srId}:${distName}`)) continue;
      await d1Execute(
        "INSERT INTO district (name, state_region_id, created_by) VALUES (?, ?, NULL)",
        [distName, srId],
      );
      addedDist++;
    }
  }
  console.log(`   district: ${addedDist} added, ${existingDist.length} existed`);

  // Build district_id lookup
  const distDbRows = await d1Query<{ district_id: number; name: string; state_region_id: number }>(
    "SELECT district_id, name, state_region_id FROM district",
  );
  const distIdMap = new Map(distDbRows.map((r) => [`${r.state_region_id}:${r.name}`, r.district_id]));

  // 10c. Townships
  const existingTwn = await d1Query<{ name: string; district_id: number }>(
    "SELECT name, district_id FROM township",
  );
  const existingTwnKeys = new Set(existingTwn.map((r) => `${r.district_id}:${r.name}`));
  let addedTwn = 0;
  for (const [srName, srData] of Object.entries(MYANMAR_LOCATIONS)) {
    const srId = srIdMap.get(srName);
    if (!srId) continue;
    for (const [distName, townships] of Object.entries(srData.districts)) {
      const distId = distIdMap.get(`${srId}:${distName}`);
      if (!distId) continue;
      for (const twnName of townships) {
        if (existingTwnKeys.has(`${distId}:${twnName}`)) continue;
        await d1Execute(
          "INSERT INTO township (name, district_id, created_by) VALUES (?, ?, NULL)",
          [twnName, distId],
        );
        addedTwn++;
      }
    }
  }
  console.log(`   township: ${addedTwn} added, ${existingTwn.length} existed`);

  console.log("\n  Done! Login with:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("  IMPORTANT: Change this password after first login.\n");
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
