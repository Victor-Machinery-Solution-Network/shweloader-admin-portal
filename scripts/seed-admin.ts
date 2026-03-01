/**
 * Seed script: Bootstrap the first admin user with full RBAC
 *
 * Seeds: permissions → features → feature_permissions → Super Admin role → admin user
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

// ─── RBAC Data (must match seed-all.ts) ─────────────────────────────────────

const PERMISSIONS = [
  { name: "create", display_order: 1 },
  { name: "read", display_order: 2 },
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
  // Marketplace (10–13)
  { name: "sale_listings", group_name: "Marketplace", display_order: 10 },
  { name: "rent_listings", group_name: "Marketplace", display_order: 11 },
  { name: "featured_listings", group_name: "Marketplace", display_order: 12 },
  { name: "enquiries", group_name: "Marketplace", display_order: 13 },
  // Users (14–16)
  { name: "users", group_name: "Users", display_order: 14 },
  { name: "partners", group_name: "Users", display_order: 15 },
  { name: "business_types", group_name: "Users", display_order: 16 },
  // Content (17–20)
  { name: "articles", group_name: "Content", display_order: 17 },
  { name: "article_categories", group_name: "Content", display_order: 18 },
  { name: "announcements", group_name: "Content", display_order: 19 },
  { name: "carousels", group_name: "Content", display_order: 20 },
  // Administration (21–25)
  { name: "admin_users", group_name: "Administration", display_order: 21 },
  { name: "roles", group_name: "Administration", display_order: 22 },
  { name: "listing_templates", group_name: "Administration", display_order: 23 },
  { name: "app_settings", group_name: "Administration", display_order: 24 },
  { name: "trash", group_name: "Administration", display_order: 25 },
];

const FEATURE_PERMISSION_MAP: Record<string, string[]> = {
  dashboard: ["read"],
  analytics: ["read"],
  sale_listings: ["create", "read", "edit", "delete", "approve"],
  rent_listings: ["create", "read", "edit", "delete", "approve"],
  featured_listings: ["create", "read", "delete"],
  enquiries: ["read", "edit", "delete"],
  users: ["read"],
  partners: ["read", "approve"],
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

  // ── 1. Seed permissions ─────────────────────────────────────────────────
  console.log("1. Seeding permissions...");
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

  // ── 2. Seed features ────────────────────────────────────────────────────
  console.log("2. Seeding features...");
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

  // ── 3. Seed feature_permissions ─────────────────────────────────────────
  console.log("3. Seeding feature_permissions...");
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

  // ── 4. Create Super Admin role ──────────────────────────────────────────
  console.log("4. Creating Super Admin role...");
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

  // ── 5. Assign all permissions to Super Admin ────────────────────────────
  console.log("5. Assigning all permissions to Super Admin...");
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

  // ── 6. Create admin user with Super Admin role ──────────────────────────
  console.log("6. Creating admin user...");
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

  console.log("\n  Done! Login with:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("  IMPORTANT: Change this password after first login.\n");
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
