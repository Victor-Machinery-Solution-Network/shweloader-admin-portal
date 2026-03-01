/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEED-ALL.TS — Comprehensive seed script for Shweloader Admin Portal
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Seeds ALL tables in dependency order. Idempotent: skips tables with data.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/seed-all.ts
 *
 * Requires CLOUDFLARE_WORKER_API_TOKEN and CLOUDFLARE_WORKER_API_URL in .env.local
 */

import bcrypt from "bcryptjs";

// ─── Configuration ───────────────────────────────────────────────────────────

const D1_BASE_URL =
  process.env.CLOUDFLARE_WORKER_API_URL ||
  "https://api.staging.shweloader.com.mm";
const D1_API_TOKEN = process.env.CLOUDFLARE_WORKER_API_TOKEN || "";
const BCRYPT_ROUNDS = 12;

// ─── D1 API Helpers ──────────────────────────────────────────────────────────

async function d1Query<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
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
  const rows = await d1Query<{ c: number }>(`SELECT COUNT(*) as c FROM ${table}`);
  return rows[0]?.c ?? 0;
}

async function d1BatchInsert(
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize = 15
) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const placeholders = batch
      .map(() => `(${columns.map(() => "?").join(", ")})`)
      .join(", ");
    const params = batch.flat();
    await d1Execute(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`,
      params
    );
  }
}

// ─── Utility Functions ───────────────────────────────────────────────────────

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

function pad(n: number, len = 3): string {
  return String(n).padStart(len, "0");
}

function generateMyanmarPhone(): string {
  const prefixes = ["9", "97", "95", "96", "99", "94", "91", "92", "93"];
  const prefix = randomItem(prefixes);
  const rest = Array.from({ length: 9 - prefix.length }, () => randomInt(0, 9)).join("");
  return `+959${prefix}${rest}`;
}

// ─── Data Definitions ────────────────────────────────────────────────────────

// ── Lookup Tables ──

const PARTNER_TYPES = ["Dealer", "Rental Company", "Individual Seller"];

const PARTNER_STATUS_TYPES = ["Pending", "Approved", "Rejected"];

const ENQUIRY_STATUS_TYPES = ["Pending", "Resolved"];

const APPROVAL_STATUS_TYPES = ["Pending", "Approved", "Rework"];

const ARTICLE_STATUS_TYPES = ["Draft", "Pending Review", "Published", "Hidden", "Rework"];

const CONDITION_TYPES = [
  "Brand New",
  "Like New",
  "Used - Excellent",
  "Used - Good",
  "Used - Fair",
  "Refurbished",
];

// ── RBAC ──

interface PermissionDef {
  name: string;
  display_order: number;
}

const PERMISSIONS: PermissionDef[] = [
  { name: "create",  display_order: 1 },
  { name: "read",    display_order: 2 },
  { name: "edit",    display_order: 3 },
  { name: "delete",  display_order: 4 },
  { name: "approve", display_order: 5 },
  { name: "restore", display_order: 6 },
];

interface FeatureDef {
  name: string;
  group_name: string;
  display_order: number;
}

const FEATURES: FeatureDef[] = [
  // Dashboard (1–2)
  { name: "dashboard",                 group_name: "Dashboard",       display_order: 1 },
  { name: "analytics",                 group_name: "Dashboard",       display_order: 2 },
  // Catalog (3–9)
  { name: "equipment_main_categories", group_name: "Catalog",         display_order: 3 },
  { name: "equipment_sub_categories",  group_name: "Catalog",         display_order: 4 },
  { name: "equipment_models",          group_name: "Catalog",         display_order: 5 },
  { name: "attachment_categories",     group_name: "Catalog",         display_order: 6 },
  { name: "attachment_models",         group_name: "Catalog",         display_order: 7 },
  { name: "brands",                    group_name: "Catalog",         display_order: 8 },
  { name: "locations",                 group_name: "Catalog",         display_order: 9 },
  // Marketplace (10–13)
  { name: "sale_listings",             group_name: "Marketplace",     display_order: 10 },
  { name: "rent_listings",             group_name: "Marketplace",     display_order: 11 },
  { name: "featured_listings",         group_name: "Marketplace",     display_order: 12 },
  { name: "enquiries",                 group_name: "Marketplace",     display_order: 13 },
  // Users (14–16)
  { name: "users",                     group_name: "Users",           display_order: 14 },
  { name: "partners",                  group_name: "Users",           display_order: 15 },
  { name: "business_types",            group_name: "Users",           display_order: 16 },
  { name: "blacklist",                 group_name: "Users",           display_order: 17 },
  // Content (18–21)
  { name: "articles",                  group_name: "Content",         display_order: 18 },
  { name: "article_categories",        group_name: "Content",         display_order: 19 },
  { name: "announcements",             group_name: "Content",         display_order: 20 },
  { name: "carousels",                 group_name: "Content",         display_order: 21 },
  // Administration (22–26)
  { name: "admin_users",               group_name: "Administration",  display_order: 22 },
  { name: "roles",                     group_name: "Administration",  display_order: 23 },
  { name: "listing_templates",         group_name: "Administration",  display_order: 24 },
  { name: "app_settings",              group_name: "Administration",  display_order: 25 },
  { name: "trash",                     group_name: "Administration",  display_order: 26 },
];

const FEATURE_PERMISSION_MAP: Record<string, string[]> = {
  // Dashboard — read only
  dashboard: ["read"],
  analytics: ["read"],
  // Marketplace — custom sets
  sale_listings: ["create", "read", "edit", "delete", "approve"],
  rent_listings: ["create", "read", "edit", "delete", "approve"],
  featured_listings: ["create", "read", "delete"],
  enquiries: ["read", "edit", "delete"],
  // Users — custom sets
  users: ["read"],
  partners: ["read", "approve"],
  blacklist: ["read", "create", "delete"],
  // Content
  articles: ["create", "read", "edit", "delete", "approve"],
  // Administration
  app_settings: ["read", "edit"],
  trash: ["read", "restore", "delete"],
};

const DEFAULT_PERMS = ["create", "read", "edit", "delete"];

// ── Roles ──

interface RoleDef {
  name: string;
  description: string;
  /** feature_name -> permission_names */
  perms: Record<string, string[]> | "all";
}

const ROLES: RoleDef[] = [
  {
    name: "Super Admin",
    description: "Full access to all features and permissions",
    perms: "all",
  },
  {
    name: "Editor",
    description: "Content management for articles, announcements, and carousels",
    perms: {
      dashboard: ["read"],
      articles: ["create", "read", "edit", "delete"],
      article_categories: ["create", "read", "edit", "delete"],
      announcements: ["create", "read", "edit", "delete"],
      carousels: ["create", "read", "edit", "delete"],
      sale_listings: ["read"],
      rent_listings: ["read"],
      users: ["read"],
      partners: ["read"],
    },
  },
  {
    name: "Sales Manager",
    description: "Manage listings, partners, and featured items",
    perms: {
      dashboard: ["read"],
      analytics: ["read"],
      sale_listings: ["create", "read", "edit", "delete", "approve"],
      rent_listings: ["create", "read", "edit", "delete", "approve"],
      featured_listings: ["create", "read", "delete"],
      partners: ["read", "approve"],
      users: ["read"],
      enquiries: ["read", "edit"],
      equipment_main_categories: ["read"],
      equipment_sub_categories: ["read"],
      equipment_models: ["read"],
      attachment_categories: ["read"],
      attachment_models: ["read"],
      brands: ["read"],
      locations: ["read"],
      listing_templates: ["read"],
    },
  },
  {
    name: "Content Manager",
    description: "Manage articles and content with approval rights",
    perms: {
      dashboard: ["read"],
      articles: ["create", "read", "edit", "delete", "approve"],
      article_categories: ["create", "read", "edit", "delete"],
      announcements: ["create", "read", "edit", "delete"],
      carousels: ["create", "read", "edit", "delete"],
      sale_listings: ["read"],
      rent_listings: ["read"],
      featured_listings: ["read"],
      users: ["read"],
      partners: ["read"],
      enquiries: ["read"],
    },
  },
  {
    name: "Support",
    description: "Handle enquiries and user support",
    perms: {
      dashboard: ["read"],
      enquiries: ["read", "edit", "delete"],
      users: ["read"],
      partners: ["read"],
      sale_listings: ["read"],
      rent_listings: ["read"],
    },
  },
  {
    name: "Viewer",
    description: "Read-only access to all features",
    perms: Object.fromEntries(FEATURES.map((f) => [f.name, ["read"]])),
  },
];

// ── Admin Users ──

const ADMIN_USERS = [
  { username: "admin", email: "admin@shweloader.com", password: "admin123!", role: "Super Admin" },
  { username: "editor_aung", email: "aung.editor@shweloader.com", password: "Editor123!", role: "Editor" },
  { username: "sales_kyaw", email: "kyaw.sales@shweloader.com", password: "Sales123!", role: "Sales Manager" },
  { username: "content_su", email: "su.content@shweloader.com", password: "Content123!", role: "Content Manager" },
  { username: "support_myo", email: "myo.support@shweloader.com", password: "Support123!", role: "Support" },
  { username: "viewer_hla", email: "hla.viewer@shweloader.com", password: "Viewer123!", role: "Viewer" },
];

// ── Business Types ──

const BUSINESS_TYPES = [
  "Construction Company",
  "Mining Company",
  "Agriculture",
  "Logistics & Transport",
  "Manufacturing",
  "Real Estate Development",
  "General Contractor",
  "Government & Public Works",
];

// ── Myanmar Cities ──

// ── Myanmar Location Hierarchy: State/Region → District → Townships ──

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

// ── Brands ──

const BRANDS = [
  "Caterpillar",
  "Komatsu",
  "Hitachi",
  "Kobelco",
  "Volvo",
  "John Deere",
  "Liebherr",
  "SANY",
  "XCMG",
  "Hyundai",
];

// ── Brand model prefixes for equipment name generation ──

const BRAND_PREFIX: Record<string, string> = {
  Caterpillar: "CAT",
  Komatsu: "PC",
  Hitachi: "ZX",
  Kobelco: "SK",
  Volvo: "EC",
  "John Deere": "JD",
  Liebherr: "LR",
  SANY: "SY",
  XCMG: "XE",
  Hyundai: "HX",
};

// ── Equipment Taxonomy ──

interface SubCategoryDef {
  name: string;
  baseModelNum: number;
}

interface MainCategoryDef {
  name: string;
  subs: SubCategoryDef[];
}

const EQUIPMENT_TAXONOMY: MainCategoryDef[] = [
  {
    name: "Excavators",
    subs: [
      { name: "Mini Excavator", baseModelNum: 17 },
      { name: "Crawler Excavator", baseModelNum: 200 },
      { name: "Wheeled Excavator", baseModelNum: 140 },
      { name: "Long Reach Excavator", baseModelNum: 350 },
      { name: "Amphibious Excavator", baseModelNum: 220 },
      { name: "Zero Tail Swing Excavator", baseModelNum: 80 },
      { name: "Demolition Excavator", baseModelNum: 390 },
      { name: "Hybrid Excavator", baseModelNum: 300 },
    ],
  },
  {
    name: "Bulldozers",
    subs: [
      { name: "Crawler Dozer", baseModelNum: 65 },
      { name: "Wheel Dozer", baseModelNum: 85 },
      { name: "Mini Dozer", baseModelNum: 37 },
      { name: "Swamp Dozer", baseModelNum: 155 },
    ],
  },
  {
    name: "Wheel Loaders",
    subs: [
      { name: "Compact Wheel Loader", baseModelNum: 903 },
      { name: "Small Wheel Loader", baseModelNum: 918 },
      { name: "Medium Wheel Loader", baseModelNum: 950 },
      { name: "Large Wheel Loader", baseModelNum: 980 },
      { name: "Backhoe Loader", baseModelNum: 420 },
    ],
  },
  {
    name: "Cranes",
    subs: [
      { name: "Tower Crane", baseModelNum: 110 },
      { name: "Mobile Crane", baseModelNum: 220 },
      { name: "Crawler Crane", baseModelNum: 300 },
      { name: "Rough Terrain Crane", baseModelNum: 55 },
      { name: "Truck Mounted Crane", baseModelNum: 160 },
      { name: "All Terrain Crane", baseModelNum: 500 },
      { name: "Mini Crane", baseModelNum: 25 },
    ],
  },
  {
    name: "Dump Trucks",
    subs: [
      { name: "Articulated Dump Truck", baseModelNum: 725 },
      { name: "Rigid Dump Truck", baseModelNum: 770 },
      { name: "Off-Highway Dump Truck", baseModelNum: 785 },
      { name: "Mining Dump Truck", baseModelNum: 797 },
    ],
  },
  {
    name: "Concrete Equipment",
    subs: [
      { name: "Concrete Mixer Truck", baseModelNum: 8 },
      { name: "Concrete Pump", baseModelNum: 36 },
      { name: "Batching Plant", baseModelNum: 60 },
      { name: "Concrete Vibrator", baseModelNum: 45 },
      { name: "Power Trowel", baseModelNum: 24 },
      { name: "Shotcrete Machine", baseModelNum: 50 },
    ],
  },
  {
    name: "Compactors",
    subs: [
      { name: "Vibratory Roller", baseModelNum: 120 },
      { name: "Pneumatic Roller", baseModelNum: 90 },
      { name: "Tandem Roller", baseModelNum: 68 },
      { name: "Plate Compactor", baseModelNum: 15 },
      { name: "Rammer", baseModelNum: 11 },
    ],
  },
  {
    name: "Forklifts",
    subs: [
      { name: "Diesel Forklift", baseModelNum: 30 },
      { name: "Electric Forklift", baseModelNum: 20 },
      { name: "Reach Truck", baseModelNum: 14 },
      { name: "Telehandler", baseModelNum: 40 },
    ],
  },
  {
    name: "Generators",
    subs: [
      { name: "Diesel Generator", baseModelNum: 200 },
      { name: "Portable Generator", baseModelNum: 35 },
      { name: "Industrial Generator", baseModelNum: 500 },
    ],
  },
  {
    name: "Piling Equipment",
    subs: [
      { name: "Pile Driver", baseModelNum: 400 },
      { name: "Sheet Pile Driver", baseModelNum: 280 },
      { name: "Bored Pile Rig", baseModelNum: 620 },
      { name: "CFA Piling Rig", baseModelNum: 516 },
      { name: "Vibro Hammer", baseModelNum: 340 },
    ],
  },
];

// ── Attachment Taxonomy ──

interface AttachmentCategoryDef {
  name: string;
  modelPrefix: string;
  sizes: string[];
}

const ATTACHMENT_TAXONOMY: AttachmentCategoryDef[] = [
  {
    name: "Buckets",
    modelPrefix: "BKT",
    sizes: ["300mm", "450mm", "600mm", "750mm", "900mm", "1200mm", "1500mm", "1800mm", "2100mm", "2400mm"],
  },
  {
    name: "Hydraulic Breakers",
    modelPrefix: "HB",
    sizes: ["150", "250", "350", "500", "680", "850", "1000", "1300", "1600", "2000"],
  },
  {
    name: "Quick Couplers",
    modelPrefix: "QC",
    sizes: ["S30", "S40", "S45", "S50", "S60", "S70", "S80", "S90", "S100", "S120"],
  },
  {
    name: "Augers",
    modelPrefix: "AUG",
    sizes: ["200mm", "300mm", "450mm", "600mm", "750mm", "900mm", "1050mm", "1200mm", "1500mm", "1800mm"],
  },
  {
    name: "Grapples",
    modelPrefix: "GRP",
    sizes: ["360S", "360M", "360L", "360XL", "5F-S", "5F-M", "5F-L", "5F-XL", "LOG-M", "LOG-L"],
  },
  {
    name: "Compactor Plates",
    modelPrefix: "CP",
    sizes: ["300", "400", "500", "600", "700", "800", "900", "1000", "1200", "1500"],
  },
  {
    name: "Rippers",
    modelPrefix: "RIP",
    sizes: ["1T", "2T", "3T", "5T", "8T", "10T", "15T", "20T", "30T", "40T"],
  },
  {
    name: "Thumbs",
    modelPrefix: "THB",
    sizes: ["24HT", "30HT", "36HT", "42HT", "48HT", "54HT", "60HT", "72HT", "84HT", "96HT"],
  },
  {
    name: "Tilt Rotators",
    modelPrefix: "TR",
    sizes: ["S3", "S4", "S5", "S6", "S7", "S8", "S10", "S12", "S14", "S20"],
  },
  {
    name: "Crushers",
    modelPrefix: "CRS",
    sizes: ["10J", "15J", "20J", "25J", "30J", "35R", "40R", "50R", "60R", "80R"],
  },
];

// ── User Names ──

const FIRST_NAMES_MALE = [
  "Aung", "Kyaw", "Myo", "Zaw", "Win", "Hla", "Tun", "Min", "Nay", "Htun",
  "Thein", "Soe", "Naing", "Ye", "Myint", "Than", "Sein", "Wai", "Thiha",
  "Pyae", "Htet", "Lin", "Phyo", "Khant", "Kaung",
];

const FIRST_NAMES_FEMALE = [
  "Aye", "Thin", "Khin", "Su", "May", "Nwe", "Ei", "Cho", "Myat", "Thiri",
  "Hnin", "Yu", "Zin", "Mon", "Wut", "Phyu", "Nandar", "Hsu", "Yadanar", "Sandar",
  "Thazin", "Nilar", "Moe", "Hay", "Shwe",
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

// ── Article Content ──

const ARTICLE_CATEGORIES = [
  "Industry News",
  "Equipment Guides",
  "Safety Tips",
  "Market Trends",
  "Project Showcases",
];

interface ArticleDef {
  title: string;
  content: string;
  author_name: string;
  estimated_read_time: number;
  category: string;
  status: string;
}

const ARTICLES: ArticleDef[] = [
  {
    title: "Top Construction Equipment Trends Shaping Myanmar in 2026",
    content: `The construction equipment industry in Myanmar is undergoing rapid transformation as the country continues its infrastructure development push. From the expansion of the Yangon-Mandalay Expressway to new industrial zones in Thilawa and Kyaukphyu, demand for modern heavy machinery has never been higher.\n\nOne of the most significant trends is the adoption of GPS-guided grading systems on bulldozers and excavators. These systems improve accuracy by up to 50% while reducing fuel consumption. Several major contractors in Yangon have already retrofitted their fleets with Trimble and Topcon guidance systems.\n\nAnother notable shift is the growing preference for fuel-efficient Tier 4 engines. While these machines carry a premium price tag, operators report 15-20% savings in diesel costs over the machine's lifecycle. With diesel prices fluctuating between 1,800 and 2,200 MMK per liter, these savings add up quickly on large-scale projects.\n\nElectric and hybrid equipment is also gaining traction, particularly for indoor demolition and urban construction sites where noise and emissions regulations are tightening. Caterpillar's 320 Electric and Komatsu's HB365 hybrid excavator have both seen increased orders from Myanmar-based contractors.`,
    author_name: "U Kyaw Min Oo",
    estimated_read_time: 5,
    category: "Industry News",
    status: "Published",
  },
  {
    title: "How to Choose the Right Excavator for Your Construction Project",
    content: `Selecting the correct excavator is one of the most critical decisions for any construction project. The wrong choice can lead to inefficiency, increased fuel costs, and project delays. This guide walks you through the key factors to consider.\n\n**Size Classification:**\nExcavators are broadly categorized by operating weight. Mini excavators (1-8 tons) excel in confined urban spaces and residential projects. Medium excavators (8-30 tons) handle most general construction tasks. Large excavators (30+ tons) are essential for mining, large earthmoving, and deep foundation work.\n\n**Digging Depth and Reach:**\nAlways match the excavator's maximum digging depth to your project requirements. For standard basement excavation in Yangon's clay soil, a machine with 5-6 meter dig depth is typically sufficient. For deep foundations or canal work, you'll need long-reach configurations offering 12-18 meters.\n\n**Hydraulic System:**\nModern excavators offer multiple hydraulic modes (Economy, Standard, Power, and Power+). For demolition attachments like breakers, ensure the machine provides adequate auxiliary hydraulic flow — typically 150-200 L/min for medium-class breakers.\n\n**Operating Costs:**\nBudget approximately $15-25 per operating hour for a 20-ton class excavator in Myanmar, including diesel, maintenance, and operator costs. Fuel consumption averages 12-18 liters per hour depending on application intensity.`,
    author_name: "U Than Win Aung",
    estimated_read_time: 7,
    category: "Equipment Guides",
    status: "Published",
  },
  {
    title: "Essential Safety Guidelines for Heavy Equipment Operations",
    content: `Heavy equipment accidents remain one of the leading causes of workplace fatalities in the construction industry. In Myanmar, where rapid development often outpaces safety training, understanding and implementing proper safety protocols is crucial.\n\n**Pre-Operation Inspection:**\nEvery shift must begin with a thorough walk-around inspection. Check hydraulic lines for leaks, verify tire/track condition, test all lights and warning devices, and ensure mirrors and cameras provide adequate visibility. Document any issues in the daily machine log.\n\n**Exclusion Zones:**\nEstablish and enforce exclusion zones around operating equipment. For excavators, maintain a minimum clearance equal to the machine's maximum reach radius plus 2 meters. Use spotters and barricades to prevent unauthorized personnel from entering the swing radius.\n\n**Load Charts and Capacity:**\nNever exceed the manufacturer's rated load capacity. For cranes, this means consulting the load chart for every lift, accounting for boom length, radius, and ground conditions. In Myanmar's monsoon season, soft ground conditions can reduce safe lifting capacity by 20-30%.\n\n**Communication:**\nStandardize hand signals across your project site and ensure all operators and ground workers are trained. Consider radio communication for operations where visual contact is limited. The universally adopted ASME B30.5 hand signal standards should be the baseline.`,
    author_name: "U Myo Thein Htun",
    estimated_read_time: 6,
    category: "Safety Tips",
    status: "Published",
  },
  {
    title: "Understanding Equipment Maintenance Schedules: A Practical Guide",
    content: `Proper maintenance is the single most important factor in maximizing equipment lifespan and minimizing unplanned downtime. A well-maintained excavator can operate for 15,000-20,000 hours before requiring a major overhaul, while neglected machines often fail at 8,000-10,000 hours.\n\n**Daily Maintenance (Every 10 Hours):**\nCheck engine oil level, coolant level, hydraulic oil level, and fuel/water separator. Grease all pins and bushings. Clean the air filter indicator. Walk around to inspect for loose bolts, cracked hoses, and fluid leaks.\n\n**Weekly Maintenance (Every 50 Hours):**\nCheck and adjust track tension (for crawler machines). Inspect drive belt condition. Clean the radiator and oil cooler fins. Check battery terminals and electrolyte levels.\n\n**Monthly Maintenance (Every 250 Hours):**\nReplace engine oil and filters. Replace fuel filters. Sample hydraulic oil for contamination analysis. Inspect and rotate tires (for wheeled equipment). Test all safety devices including ROPS/FOPS structures.\n\n**Seasonal Considerations for Myanmar:**\nDuring the monsoon season (May-October), increase undercarriage cleaning frequency to prevent mud buildup that accelerates track wear. Check and replace air filters more frequently due to higher humidity. Ensure all drain holes in the cab and engine compartment are clear.`,
    author_name: "Daw Su Myat Noe",
    estimated_read_time: 6,
    category: "Equipment Guides",
    status: "Published",
  },
  {
    title: "The Rise of Electric Construction Equipment in Southeast Asia",
    content: `Electric construction equipment is no longer a distant future concept — it's arriving on job sites across Southeast Asia. While Myanmar's adoption is still in early stages, neighboring countries like Thailand and Singapore are setting the pace, and the trend is expected to reach Myanmar within the next 2-3 years.\n\n**Current Market Leaders:**\nVolvo CE leads the compact electric segment with their ECR25 Electric and L25 Electric models. Caterpillar's 320 Electric excavator and SANY's electric mini excavators are also gaining market share. These machines produce zero direct emissions, 90% less noise, and have significantly lower operating costs.\n\n**Challenges for Myanmar:**\nThe primary barriers to adoption in Myanmar are the upfront cost premium (typically 30-50% higher than diesel equivalents), limited charging infrastructure, and the reliability of the electrical grid on remote project sites. However, for urban construction in Yangon and Mandalay, where electricity is more reliable and noise regulations are stricter, electric equipment makes strong economic sense.\n\n**Total Cost of Ownership:**\nDespite higher purchase prices, electric equipment offers compelling lifecycle economics. Electricity costs approximately 75 MMK per kWh in Myanmar versus 2,000 MMK per liter of diesel. A 20-ton electric excavator consumes roughly 40-50 kWh per shift versus 100-120 liters of diesel — representing a 70% reduction in energy costs.`,
    author_name: "U Aung Zaw Htet",
    estimated_read_time: 5,
    category: "Market Trends",
    status: "Published",
  },
  {
    title: "Crane Safety: Critical Tips Every Operator Must Know",
    content: `Crane operations involve some of the highest-risk activities on any construction site. A single misjudgment can result in catastrophic consequences — dropped loads, tip-overs, and contact with power lines are among the most common and devastating crane accidents.\n\n**Ground Conditions:**\nBefore setting up any crane, conduct a thorough ground assessment. The bearing capacity must support the combined weight of the crane, counterweight, and maximum rated load. In Myanmar's alluvial soil — common in the Ayeyarwady Delta and lower Yangon — timber mats or steel plates may be required to distribute outrigger loads.\n\n**Wind Speed Monitoring:**\nCease all lifting operations when wind speeds exceed the manufacturer's specifications — typically 20-25 km/h for tower cranes. During Myanmar's hot season (March-May), sudden afternoon thunderstorms with gusts exceeding 60 km/h can develop rapidly. Install anemometers on all tower cranes and designate a weather monitor.\n\n**Lift Planning:**\nEvery critical lift (defined as loads exceeding 75% of rated capacity, lifts over occupied structures, or tandem lifts) requires a written lift plan reviewed by a competent person. The plan should include load weight calculation, rigging details, crane configuration, ground bearing capacity, and swing path analysis.`,
    author_name: "U Zaw Min Naing",
    estimated_read_time: 5,
    category: "Safety Tips",
    status: "Published",
  },
  {
    title: "Guide to Renting vs Buying Construction Equipment in Myanmar",
    content: `The rent-versus-buy decision is one that every construction company in Myanmar faces regularly. Both options have distinct advantages, and the optimal choice depends on project duration, utilization rate, financial position, and long-term business strategy.\n\n**When to Rent:**\nRenting makes sense when you need specialized equipment for a short-duration project (less than 6 months), when you want to test a new machine type before committing to purchase, or when your company's capital is better deployed elsewhere. Monthly rental rates in Myanmar typically range from 3-5% of the equipment's purchase price.\n\n**When to Buy:**\nPurchasing is more economical when you expect utilization rates above 60% (roughly 1,200+ hours per year). For core fleet equipment like excavators and wheel loaders that you'll use across multiple projects, ownership usually provides better long-term value. Used equipment from Japan and Korea offers an excellent middle ground — typically 40-60% cheaper than new.\n\n**Financial Analysis:**\nA simple breakeven calculation: divide the purchase price by the monthly rental rate. If your expected usage period exceeds this breakeven point, buying is more economical. For example, a Komatsu PC200 priced at $90,000 USD with a monthly rental of $3,500 breaks even at approximately 26 months.\n\n**Hidden Costs:**\nWhen buying, budget for insurance (1-2% of value annually), maintenance (10-15% of value annually), operator training, and storage. When renting, factor in mobilization/demobilization fees, potential damage deposits, and minimum rental periods.`,
    author_name: "Daw Khin May Thet",
    estimated_read_time: 7,
    category: "Market Trends",
    status: "Published",
  },
  {
    title: "Myanmar's Infrastructure Boom: Projects Driving Equipment Demand",
    content: `Myanmar's infrastructure development continues to accelerate, creating unprecedented demand for construction equipment across the country. Several mega-projects are reshaping the landscape and driving the heavy equipment market.\n\n**Yangon Elevated Expressway:**\nThe 27.7 km elevated expressway connecting Mingaladon to Thilawa Special Economic Zone represents one of the largest infrastructure investments in Myanmar's history. The project requires hundreds of piling rigs, crawler cranes, and concrete equipment, with peak construction expected to generate demand for over 500 heavy machines simultaneously.\n\n**New Yangon City:**\nThe ambitious New Yangon City development on the western bank of the Yangon River aims to create a modern satellite city spanning 20,000 acres. Earth-moving requirements alone are estimated at 200 million cubic meters — requiring a fleet of large excavators, dump trucks, and bulldozers operating continuously for years.\n\n**Regional Connectivity:**\nThe upgrading of highways connecting Myanmar to Thailand, China, and India is creating equipment demand in previously underserved regions. The India-Myanmar-Thailand Trilateral Highway and the Kyaukphyu-Kunming corridor are driving growth in Shan State, Sagaing Region, and Rakhine State.`,
    author_name: "U Naing Lin Htet",
    estimated_read_time: 5,
    category: "Project Showcases",
    status: "Pending Review",
  },
  {
    title: "Essential Attachments Every Excavator Owner Should Consider",
    content: `An excavator's versatility multiplies dramatically with the right attachments. By investing in key attachments, a single machine can handle tasks that would otherwise require multiple specialized pieces of equipment.\n\n**Hydraulic Breaker:**\nThe most popular excavator attachment worldwide. Essential for demolition, rock breaking, and trench work in hard ground. Match the breaker class to your excavator weight — a 20-ton excavator pairs well with a 1,000-1,500 kg class breaker. Expect to pay $8,000-25,000 USD depending on size.\n\n**Quick Coupler:**\nA quick coupler allows operators to switch between buckets and attachments in under 60 seconds from the cab. This dramatically improves productivity on sites requiring frequent attachment changes. Fully automatic tilt-rotator couplers offer the ultimate flexibility but at a premium price.\n\n**Compactor Plate:**\nMounted on the excavator arm, compactor plates allow trench compaction without requiring a separate compaction machine. Ideal for utility trench work where a vibratory roller cannot access. Productivity rates of 150-200 square meters per hour are typical.\n\n**Sorting Grapple:**\nPerfect for demolition waste sorting, landscaping, and material handling. A 5-finger sorting grapple on a 20-ton excavator can process 100-150 tons of demolition material per shift, separating concrete, steel, and wood for recycling.`,
    author_name: "U Thet Naing Win",
    estimated_read_time: 6,
    category: "Equipment Guides",
    status: "Draft",
  },
  {
    title: "How to Evaluate Used Construction Equipment Before Purchase",
    content: `Buying used construction equipment can save 40-60% compared to new, but it requires careful evaluation to avoid costly mistakes. This checklist will help you assess any used machine before committing to purchase.\n\n**Hour Meter Verification:**\nThe hour meter is the first thing to check, but don't trust it blindly. Cross-reference with service records, and inspect wear patterns on pedals, joysticks, and the operator seat. A machine showing 5,000 hours but with worn-through pedal rubber likely has significantly more actual hours.\n\n**Hydraulic System:**\nPerform a hydraulic drift test: raise the boom to full height, shut off the engine, and time how long it takes to drift down. More than 50mm of drift in 5 minutes indicates worn cylinder seals. Check hydraulic oil color and smell — dark, burnt-smelling oil suggests overheating history.\n\n**Undercarriage (Crawler Machines):**\nUndercarriage replacement can cost 30-50% of a used machine's value. Measure track link pitch to assess wear percentage. Check for cracked or chipped track shoes, worn sprocket teeth, and leaking track rollers. Budget $15,000-40,000 USD for a full undercarriage rebuild on a 20-30 ton excavator.\n\n**Engine Health:**\nConduct a cold start test — excessive white or blue smoke on startup indicates worn rings or valve seals. Check for coolant in the oil (milky appearance) which suggests head gasket issues. If possible, arrange an oil analysis from a laboratory — this reveals internal wear metals and contamination levels.`,
    author_name: "U Ye Myint Swe",
    estimated_read_time: 8,
    category: "Equipment Guides",
    status: "Rejected",
  },
];

// ── Custom Field Templates ──

const CUSTOM_FIELD_TEMPLATES = [
  {
    name: "Heavy Equipment Specs",
    fields: [
      { key: "year", label: "Year of Manufacture", type: "number", required: true, order: 0 },
      { key: "operating-hours", label: "Operating Hours", type: "number", required: true, order: 1 },
      { key: "operating-weight", label: "Operating Weight (kg)", type: "number", required: false, order: 2 },
      { key: "engine-power", label: "Engine Power (HP)", type: "number", required: false, order: 3 },
      { key: "fuel-type", label: "Fuel Type", type: "dropdown", required: true, options: ["Diesel", "Gasoline", "Electric", "Hybrid"], order: 4 },
    ],
  },
  {
    name: "Rental Terms",
    fields: [
      { key: "min-rental-days", label: "Minimum Rental Period (days)", type: "number", required: true, order: 0 },
      { key: "delivery-included", label: "Delivery Included", type: "boolean", required: false, order: 1 },
      { key: "operator-included", label: "Operator Included", type: "boolean", required: false, order: 2 },
      { key: "insurance-required", label: "Insurance Required", type: "boolean", required: true, order: 3 },
      { key: "availability-date", label: "Available From", type: "date", required: false, order: 4 },
    ],
  },
  {
    name: "Equipment Condition Report",
    fields: [
      { key: "service-history", label: "Service History Available", type: "boolean", required: false, order: 0 },
      { key: "last-service-date", label: "Last Service Date", type: "date", required: false, order: 1 },
      { key: "hour-meter", label: "Hour Meter Reading", type: "number", required: true, order: 2 },
      { key: "overall-rating", label: "Overall Rating", type: "dropdown", required: true, options: ["Excellent", "Good", "Fair", "Poor"], order: 3 },
      { key: "damage-notes", label: "Damage / Defect Notes", type: "text", required: false, order: 4 },
    ],
  },
];

// ── Listing Descriptions ──

const LISTING_DESCRIPTIONS = [
  "Well-maintained machine with full service history. Recently serviced with new filters and fluids. Ready for immediate deployment on your project site.",
  "Low-hour unit imported directly from Japan. Excellent condition with minimal wear on undercarriage. All functions tested and operating within factory specifications.",
  "One-owner machine from a reputable construction company. Used primarily on highway projects. Cab is clean with functioning A/C. All safety devices operational.",
  "Recently overhauled engine and hydraulic system. New paint and decals. Machine looks and operates like a much newer unit. Extended warranty available.",
  "Fleet unit being replaced due to upgrade. Consistent maintenance performed by certified technicians. Maintenance records available for inspection.",
  "Imported from Korea with original documentation. Machine has been thoroughly inspected and tested. Minor cosmetic wear consistent with age, mechanically sound.",
  "High-specification model with additional hydraulic lines, pattern changer, and LED work lights. Perfect for demolition or utility work requiring multiple attachments.",
  "Clean machine from a rental fleet. Higher hours but meticulously maintained on schedule. All wear parts recently replaced including pins, bushings, and cutting edge.",
  "Government surplus unit in excellent working condition. Low utilization with majority of hours at idle. Full documentation and title transfer included.",
  "Dealer-certified used equipment with 6-month powertrain warranty. Passed rigorous 150-point inspection. Financing options available through partner banks.",
  "Well-preserved unit stored in covered warehouse when not in use. Minimal rust and corrosion. Rubber tracks at 70% life remaining. Ready to work.",
  "Multi-purpose machine suitable for various applications. Comes equipped with standard bucket and quick coupler. Delivery available nationwide within Myanmar.",
  "Premium condition unit with factory-installed air suspension seat and rearview camera. Ideal for operators who value comfort during long shifts.",
  "Economical workhorse perfect for small to medium projects. Low fuel consumption and easy maintenance make this an excellent value proposition.",
  "Recently imported with all customs documentation complete. Machine cleared and ready for immediate pickup from our Thilawa warehouse facility.",
];

// ── Announcement Texts ──

const ANNOUNCEMENTS = [
  "Welcome to Shweloader! Myanmar's premier platform for construction equipment sales and rentals.",
  "New equipment listings added daily from verified dealers across Myanmar. Browse the latest arrivals now!",
  "Special promotion: List your equipment for free during the launch period. Limited time offer!",
  "Shweloader now supports secure online enquiries. Contact sellers directly through our platform.",
  "Looking for equipment financing? Our partner banks offer competitive rates for verified buyers.",
];

// ── App Settings ──

const APP_SETTINGS = [
  { setting_key: "carousel_enabled", value: "true" },
  { setting_key: "announcement_bar_enabled", value: "true" },
  { setting_key: "articles_enabled", value: "true" },
  { setting_key: "exchange_rate", value: "3200" },
];

// ── Enquiry Messages ──

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

// ═══════════════════════════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

let step = 0;
const totalSteps = 30;

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
  const existing = await d1Query<{ name: string }>("SELECT name FROM partner_type");
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = PARTNER_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) { log(`  [skip] all ${PARTNER_TYPES.length} types exist`); return; }

  await d1BatchInsert("partner_type", ["name"], missing.map((n) => [n]));
  log(`  [add] ${missing.length} partner types (${existing.length} existed)`);
}

// ── 2. Partner Status Types ──

async function seedPartnerStatusTypes() {
  stepHeader("Seeding partner_status_type...");
  const existing = await d1Query<{ status_name: string }>("SELECT status_name FROM partner_status_type");
  const existingNames = new Set(existing.map((r) => r.status_name));
  const missing = PARTNER_STATUS_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) { log(`  [skip] all ${PARTNER_STATUS_TYPES.length} types exist`); return; }

  await d1BatchInsert("partner_status_type", ["status_name"], missing.map((n) => [n]));
  log(`  [add] ${missing.length} partner status types (${existing.length} existed)`);
}

// ── 3. Enquiry Status Types ──

async function seedEnquiryStatusTypes() {
  stepHeader("Seeding enquiry_status_type...");
  const existing = await d1Query<{ status_name: string }>("SELECT status_name FROM enquiry_status_type");
  const existingNames = new Set(existing.map((r) => r.status_name));
  const missing = ENQUIRY_STATUS_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) { log(`  [skip] all ${ENQUIRY_STATUS_TYPES.length} types exist`); return; }

  await d1BatchInsert("enquiry_status_type", ["status_name"], missing.map((n) => [n]));
  log(`  [add] ${missing.length} enquiry status types (${existing.length} existed)`);
}

// ── 4. Approval Status Types ──

async function seedApprovalStatusTypes() {
  stepHeader("Seeding approval_status_type...");
  const existing = await d1Query<{ status_name: string }>("SELECT status_name FROM approval_status_type");
  const existingNames = new Set(existing.map((r) => r.status_name));
  const missing = APPROVAL_STATUS_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) { log(`  [skip] all ${APPROVAL_STATUS_TYPES.length} types exist`); return; }

  await d1BatchInsert("approval_status_type", ["status_name"], missing.map((n) => [n]));
  log(`  [add] ${missing.length} approval status types (${existing.length} existed)`);
}

// ── 5. Article Status Types ──

async function seedArticleStatusTypes() {
  stepHeader("Seeding article_status_type...");
  const existing = await d1Query<{ status_name: string }>("SELECT status_name FROM article_status_type");
  const existingNames = new Set(existing.map((r) => r.status_name));
  const missing = ARTICLE_STATUS_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) { log(`  [skip] all ${ARTICLE_STATUS_TYPES.length} types exist`); return; }

  await d1BatchInsert("article_status_type", ["status_name"], missing.map((n) => [n]));
  log(`  [add] ${missing.length} article status types (${existing.length} existed)`);
}

// ── 6. Condition Types ──

async function seedConditionTypes() {
  stepHeader("Seeding condition_type...");
  const existing = await d1Query<{ name: string }>("SELECT name FROM condition_type");
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = CONDITION_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) { log(`  [skip] all ${CONDITION_TYPES.length} types exist`); return; }

  await d1BatchInsert("condition_type", ["name"], missing.map((n) => [n]));
  log(`  [add] ${missing.length} condition types (${existing.length} existed)`);
}

// ── 7. RBAC: Permissions + Features + Feature Permissions ──

async function seedRBAC() {
  stepHeader("Seeding RBAC (permissions, features, feature_permissions)...");

  // Permissions
  const existingPerms = await d1Query<{ name: string }>("SELECT name FROM permission");
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
  log(`  permissions: ${addedPerms} added, ${existingPermNames.size} existed`);

  // Features
  const existingFeats = await d1Query<{ name: string }>("SELECT name FROM feature");
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
  log(`  features: ${addedFeats} added, ${existingFeatNames.size} existed`);

  // Feature Permissions
  const features = await d1Query<{ feature_id: number; name: string }>("SELECT feature_id, name FROM feature");
  const permissions = await d1Query<{ permission_id: number; name: string }>("SELECT permission_id, name FROM permission");
  const existingFP = await d1Query<{ feature_id: number; permission_id: number }>(
    "SELECT feature_id, permission_id FROM feature_permission"
  );
  const featureMap = new Map(features.map((f) => [f.name, f.feature_id]));
  const permMap = new Map(permissions.map((p) => [p.name, p.permission_id]));
  const existingFPSet = new Set(existingFP.map((e) => `${e.feature_id}:${e.permission_id}`));

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
        [fid, pid]
      );
      addedFP++;
    }
  }
  log(`  feature_permissions: ${addedFP} added, ${existingFP.length} existed`);
}

// ── 8. Roles + Role Permissions ──

async function seedRoles(): Promise<Map<string, number>> {
  stepHeader("Seeding roles and role_permissions...");

  const features = await d1Query<{ feature_id: number; name: string }>("SELECT feature_id, name FROM feature");
  const permissions = await d1Query<{ permission_id: number; name: string }>("SELECT permission_id, name FROM permission");
  const allFP = await d1Query<{ feature_permission_id: number; feature_id: number; permission_id: number }>(
    "SELECT feature_permission_id, feature_id, permission_id FROM feature_permission"
  );

  const featureMap = new Map(features.map((f) => [f.name, f.feature_id]));
  const permMap = new Map(permissions.map((p) => [p.name, p.permission_id]));

  const roleIdMap = new Map<string, number>();

  for (const roleDef of ROLES) {
    // Check if role exists
    const existing = await d1Query<{ role_id: number }>(
      "SELECT role_id FROM role WHERE name = ?",
      [roleDef.name]
    );

    let roleId: number;
    if (existing.length > 0) {
      roleId = existing[0].role_id;
      log(`  [skip] Role "${roleDef.name}" (role_id: ${roleId})`);
    } else {
      await d1Execute(
        "INSERT INTO role (name, description, created_by) VALUES (?, ?, NULL)",
        [roleDef.name, roleDef.description]
      );
      const [inserted] = await d1Query<{ role_id: number }>(
        "SELECT role_id FROM role WHERE name = ?",
        [roleDef.name]
      );
      roleId = inserted.role_id;
      log(`  [add]  Role "${roleDef.name}" (role_id: ${roleId})`);
    }

    roleIdMap.set(roleDef.name, roleId);

    // Assign permissions to role
    const existingRP = await d1Query<{ feature_permission_id: number }>(
      "SELECT feature_permission_id FROM role_permission WHERE role_id = ?",
      [roleId]
    );
    const existingRPSet = new Set(existingRP.map((r) => r.feature_permission_id));

    let addedRP = 0;
    if (roleDef.perms === "all") {
      for (const fp of allFP) {
        if (existingRPSet.has(fp.feature_permission_id)) continue;
        await d1Execute(
          "INSERT INTO role_permission (role_id, feature_permission_id, granted_by) VALUES (?, ?, NULL)",
          [roleId, fp.feature_permission_id]
        );
        addedRP++;
      }
    } else {
      for (const [featName, permNames] of Object.entries(roleDef.perms)) {
        const fid = featureMap.get(featName);
        if (!fid) continue;
        for (const pName of permNames) {
          const pid = permMap.get(pName);
          if (!pid) continue;
          const fp = allFP.find((x) => x.feature_id === fid && x.permission_id === pid);
          if (!fp || existingRPSet.has(fp.feature_permission_id)) continue;
          await d1Execute(
            "INSERT INTO role_permission (role_id, feature_permission_id, granted_by) VALUES (?, ?, NULL)",
            [roleId, fp.feature_permission_id]
          );
          addedRP++;
        }
      }
    }
    if (addedRP > 0) log(`         → ${addedRP} permissions granted`);
  }

  return roleIdMap;
}

// ── 9. Admin Users ──

async function seedAdminUsers(roleIdMap: Map<string, number>): Promise<number[]> {
  stepHeader("Seeding admin_user...");

  const adminIds: number[] = [];

  for (const admin of ADMIN_USERS) {
    const existing = await d1Query<{ user_id: number }>(
      "SELECT user_id FROM admin_user WHERE email = ?",
      [admin.email]
    );

    if (existing.length > 0) {
      adminIds.push(existing[0].user_id);
      log(`  [skip] ${admin.email} (user_id: ${existing[0].user_id})`);
      continue;
    }

    const hash = await bcrypt.hash(admin.password, BCRYPT_ROUNDS);
    const roleId = roleIdMap.get(admin.role) ?? null;

    await d1Execute(
      "INSERT INTO admin_user (username, email, password_hash, role_id, active) VALUES (?, ?, ?, ?, 1)",
      [admin.username, admin.email, hash, roleId]
    );

    const [inserted] = await d1Query<{ user_id: number }>(
      "SELECT user_id FROM admin_user WHERE email = ?",
      [admin.email]
    );
    adminIds.push(inserted.user_id);
    log(`  [add]  ${admin.email} (role: ${admin.role}, user_id: ${inserted.user_id})`);
  }

  return adminIds;
}

// ── 10. Business Types ──

async function seedBusinessTypes(adminIds: number[]) {
  stepHeader("Seeding business_type...");
  const existing = await d1Query<{ name: string }>("SELECT name FROM business_type");
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = BUSINESS_TYPES.filter((n) => !existingNames.has(n));
  if (missing.length === 0) { log(`  [skip] all ${BUSINESS_TYPES.length} types exist`); return; }

  const rows = missing.map((name) => [name, 0, randomItem(adminIds)]);
  await d1BatchInsert("business_type", ["name", "is_listed", "created_by"], rows);
  log(`  [add] ${missing.length} business types (${existing.length} existed)`);
}

// ── 11. State/Region → District → Township ──

async function seedLocations(adminIds: number[]) {
  // 11a. State/Region
  stepHeader("Seeding state_region...");
  const existingSR = await d1Query<{ name: string }>("SELECT name FROM state_region");
  const existingSRNames = new Set(existingSR.map((r) => r.name));
  const allSRNames = Object.keys(MYANMAR_LOCATIONS);
  const missingSR = allSRNames.filter((n) => !existingSRNames.has(n));

  if (missingSR.length > 0) {
    const rows = missingSR.map((name) => [name, MYANMAR_LOCATIONS[name].type, randomItem(adminIds)]);
    await d1BatchInsert("state_region", ["name", "type", "created_by"], rows);
    log(`  [add] ${missingSR.length} state/regions (${existingSR.length} existed)`);
  } else {
    log(`  [skip] all ${allSRNames.length} state/regions exist`);
  }

  // Build state_region_id lookup
  const srRows = await d1Query<{ state_region_id: number; name: string }>("SELECT state_region_id, name FROM state_region");
  const srIdMap = new Map(srRows.map((r) => [r.name, r.state_region_id]));

  // 11b. Districts
  stepHeader("Seeding district...");
  const existingDist = await d1Query<{ name: string; state_region_id: number }>("SELECT name, state_region_id FROM district");
  const existingDistKeys = new Set(existingDist.map((r) => `${r.state_region_id}:${r.name}`));

  const distRows: unknown[][] = [];
  for (const [srName, srData] of Object.entries(MYANMAR_LOCATIONS)) {
    const srId = srIdMap.get(srName)!;
    for (const distName of Object.keys(srData.districts)) {
      if (!existingDistKeys.has(`${srId}:${distName}`)) {
        distRows.push([distName, srId, randomItem(adminIds)]);
      }
    }
  }

  if (distRows.length > 0) {
    await d1BatchInsert("district", ["name", "state_region_id", "created_by"], distRows);
    log(`  [add] ${distRows.length} districts (${existingDist.length} existed)`);
  } else {
    log(`  [skip] all districts exist`);
  }

  // Build district_id lookup
  const distDbRows = await d1Query<{ district_id: number; name: string; state_region_id: number }>(
    "SELECT district_id, name, state_region_id FROM district"
  );
  const distIdMap = new Map(distDbRows.map((r) => [`${r.state_region_id}:${r.name}`, r.district_id]));

  // 11c. Townships
  stepHeader("Seeding township...");
  const existingTwn = await d1Query<{ name: string; district_id: number }>("SELECT name, district_id FROM township");
  const existingTwnKeys = new Set(existingTwn.map((r) => `${r.district_id}:${r.name}`));

  const twnRows: unknown[][] = [];
  for (const [srName, srData] of Object.entries(MYANMAR_LOCATIONS)) {
    const srId = srIdMap.get(srName)!;
    for (const [distName, townships] of Object.entries(srData.districts)) {
      const distId = distIdMap.get(`${srId}:${distName}`)!;
      for (const twnName of townships) {
        if (!existingTwnKeys.has(`${distId}:${twnName}`)) {
          twnRows.push([twnName, distId, randomItem(adminIds)]);
        }
      }
    }
  }

  if (twnRows.length > 0) {
    await d1BatchInsert("township", ["name", "district_id", "created_by"], twnRows);
    log(`  [add] ${twnRows.length} townships (${existingTwn.length} existed)`);
  } else {
    log(`  [skip] all townships exist`);
  }
}

// ── 12. Brands ──

async function seedBrands(adminIds: number[]) {
  stepHeader("Seeding product_brand...");
  const existing = await d1Query<{ name: string }>("SELECT name FROM product_brand");
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = BRANDS.filter((n) => !existingNames.has(n));
  if (missing.length === 0) { log(`  [skip] all ${BRANDS.length} brands exist`); return; }

  const rows = missing.map((name) => [name, randomItem(adminIds)]);
  await d1BatchInsert("product_brand", ["name", "created_by"], rows);
  log(`  [add] ${missing.length} brands (${existing.length} existed)`);
}

// ── 13. Equipment Main Categories ──

async function seedEquipmentMainCategories(adminIds: number[]) {
  stepHeader("Seeding equipment_main_category...");
  const existing = await d1Query<{ name: string }>("SELECT name FROM equipment_main_category");
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = EQUIPMENT_TAXONOMY.filter((cat) => !existingNames.has(cat.name));
  if (missing.length === 0) { log(`  [skip] all ${EQUIPMENT_TAXONOMY.length} main categories exist`); return; }

  const rows = missing.map((cat, i) => [
    cat.name,
    `https://placehold.co/200x200/1a1a2e/ffffff?text=${encodeURIComponent(cat.name)}`,
    String(existing.length + i),
    randomItem(adminIds),
  ]);
  await d1BatchInsert(
    "equipment_main_category",
    ["name", "image_url", "display_order", "created_by"],
    rows
  );
  log(`  [add] ${missing.length} main categories (${existing.length} existed)`);
}

// ── 14. Equipment Sub Categories ──

async function seedEquipmentSubCategories(adminIds: number[]) {
  stepHeader("Seeding equipment_sub_category...");
  const existing = await d1Query<{ name: string }>("SELECT name FROM equipment_sub_category");
  const existingNames = new Set(existing.map((r) => r.name));

  const mainCats = await d1Query<{ category_id: number; name: string }>(
    "SELECT category_id, name FROM equipment_main_category"
  );
  const mainMap = new Map(mainCats.map((c) => [c.name, c.category_id]));

  let total = 0;
  for (const cat of EQUIPMENT_TAXONOMY) {
    const catId = mainMap.get(cat.name);
    if (!catId) continue;

    const missingSubs = cat.subs.filter((sub) => !existingNames.has(sub.name));
    if (missingSubs.length === 0) continue;

    const rows = missingSubs.map((sub, i) => [
      catId,
      sub.name,
      `https://placehold.co/200x200/1a1a2e/ffffff?text=${encodeURIComponent(sub.name)}`,
      String(existing.length + total + i),
      randomItem(adminIds),
    ]);
    await d1BatchInsert(
      "equipment_sub_category",
      ["category_id", "name", "image_url", "display_order", "created_by"],
      rows
    );
    total += rows.length;
  }
  if (total === 0) log(`  [skip] all sub-categories exist`);
  else log(`  [add] ${total} sub-categories (${existing.length} existed)`);
}

// ── 15. Equipment Sub Category Brands ──

async function seedEquipmentSubCategoryBrands(adminIds: number[]) {
  stepHeader("Seeding equipment_sub_category_brand...");
  const count = await d1Count("equipment_sub_category_brand");
  if (count > 0) { log(`  [skip] ${count} rows exist`); return; }

  const subCats = await d1Query<{ sub_category_id: number }>(
    "SELECT sub_category_id FROM equipment_sub_category"
  );
  const brands = await d1Query<{ brand_id: number }>(
    "SELECT brand_id FROM product_brand"
  );
  const brandIds = brands.map((b) => b.brand_id);

  let total = 0;
  for (const sub of subCats) {
    const numBrands = randomInt(3, Math.min(6, brandIds.length));
    const selectedBrands = shuffle(brandIds).slice(0, numBrands);
    const rows = selectedBrands.map((bid) => [sub.sub_category_id, bid, randomItem(adminIds)]);
    await d1BatchInsert(
      "equipment_sub_category_brand",
      ["sub_category_id", "brand_id", "created_by"],
      rows
    );
    total += rows.length;
  }
  log(`  [add] ${total} sub-category-brand links`);
}

// ── 16. Equipment Models ──

async function seedEquipmentModels(adminIds: number[]) {
  stepHeader("Seeding equipment_model (5 per sub-category)...");
  const count = await d1Count("equipment_model");
  if (count > 0) { log(`  [skip] ${count} rows exist`); return; }

  // Get sub-categories with their brands
  const subCats = await d1Query<{ sub_category_id: number; name: string; category_id: number }>(
    "SELECT sub_category_id, name, category_id FROM equipment_sub_category"
  );
  const brands = await d1Query<{ brand_id: number; name: string }>(
    "SELECT brand_id, name FROM product_brand"
  );

  // Get sub-category brand mappings
  const scBrands = await d1Query<{ sub_category_id: number; brand_id: number }>(
    "SELECT sub_category_id, brand_id FROM equipment_sub_category_brand"
  );
  const scBrandMap = new Map<number, number[]>();
  for (const scb of scBrands) {
    if (!scBrandMap.has(scb.sub_category_id)) scBrandMap.set(scb.sub_category_id, []);
    scBrandMap.get(scb.sub_category_id)!.push(scb.brand_id);
  }

  const brandMap = new Map(brands.map((b) => [b.brand_id, b.name]));

  // Find base model nums from taxonomy
  const subBaseNums = new Map<string, number>();
  for (const cat of EQUIPMENT_TAXONOMY) {
    for (const sub of cat.subs) {
      subBaseNums.set(sub.name, sub.baseModelNum);
    }
  }

  const usedNames = new Set<string>();
  let total = 0;

  for (const sub of subCats) {
    const availableBrandIds = scBrandMap.get(sub.sub_category_id) ?? brands.map((b) => b.brand_id);
    const baseNum = subBaseNums.get(sub.name) ?? 100;

    const rows: unknown[][] = [];
    for (let i = 0; i < 5; i++) {
      const brandId = availableBrandIds[i % availableBrandIds.length];
      const brandName = brandMap.get(brandId) ?? "Generic";
      const prefix = BRAND_PREFIX[brandName] ?? brandName.slice(0, 2).toUpperCase();
      const modelNum = baseNum + i * randomInt(5, 20);

      let name = `${prefix} ${modelNum}`;
      // Ensure uniqueness
      while (usedNames.has(name)) {
        name = `${prefix} ${modelNum + randomInt(1, 99)}`;
      }
      usedNames.add(name);

      rows.push([name, brandId, sub.sub_category_id, null, randomItem(adminIds)]);
    }

    await d1BatchInsert(
      "equipment_model",
      ["name", "brand_id", "sub_category_id", "pdf_url", "created_by"],
      rows
    );
    total += rows.length;
  }
  log(`  [add] ${total} equipment models`);
}

// ── 17. Attachment Categories ──

async function seedAttachmentCategories(adminIds: number[]) {
  stepHeader("Seeding attachment_category...");
  const existing = await d1Query<{ name: string }>("SELECT name FROM attachment_category");
  const existingNames = new Set(existing.map((r) => r.name));
  const missing = ATTACHMENT_TAXONOMY.filter((cat) => !existingNames.has(cat.name));
  if (missing.length === 0) { log(`  [skip] all ${ATTACHMENT_TAXONOMY.length} attachment categories exist`); return; }

  const rows = missing.map((cat, i) => [
    cat.name,
    `https://placehold.co/200x200/1a1a2e/ffffff?text=${encodeURIComponent(cat.name)}`,
    String(existing.length + i),
    randomItem(adminIds),
  ]);
  await d1BatchInsert(
    "attachment_category",
    ["name", "image_url", "display_order", "created_by"],
    rows
  );
  log(`  [add] ${missing.length} attachment categories (${existing.length} existed)`);
}

// ── 18. Attachment Category Brands ──

async function seedAttachmentCategoryBrands(adminIds: number[]) {
  stepHeader("Seeding attachment_category_brand...");
  const count = await d1Count("attachment_category_brand");
  if (count > 0) { log(`  [skip] ${count} rows exist`); return; }

  const cats = await d1Query<{ category_id: number }>(
    "SELECT category_id FROM attachment_category"
  );
  const brands = await d1Query<{ brand_id: number }>(
    "SELECT brand_id FROM product_brand"
  );
  const brandIds = brands.map((b) => b.brand_id);

  let total = 0;
  for (const cat of cats) {
    const numBrands = randomInt(3, Math.min(6, brandIds.length));
    const selectedBrands = shuffle(brandIds).slice(0, numBrands);
    const rows = selectedBrands.map((bid) => [cat.category_id, bid, randomItem(adminIds)]);
    await d1BatchInsert(
      "attachment_category_brand",
      ["category_id", "brand_id", "created_by"],
      rows
    );
    total += rows.length;
  }
  log(`  [add] ${total} attachment-category-brand links`);
}

// ── 19. Attachment Models ──

async function seedAttachmentModels(adminIds: number[]) {
  stepHeader("Seeding attachment_model (10 per category = 100 total)...");
  const existingModels = await d1Query<{ name: string }>("SELECT name FROM attachment_model");
  const existingModelNames = new Set(existingModels.map((r) => r.name));

  const cats = await d1Query<{ category_id: number; name: string }>(
    "SELECT category_id, name FROM attachment_category"
  );
  const brands = await d1Query<{ brand_id: number; name: string }>(
    "SELECT brand_id, name FROM product_brand"
  );
  const catMap = new Map(ATTACHMENT_TAXONOMY.map((c) => [c.name, c]));

  let total = 0;
  for (const cat of cats) {
    const def = catMap.get(cat.name);
    if (!def) continue;

    const rows = def.sizes
      .map((size, i) => {
        const brand = brands[i % brands.length];
        const name = `${brand.name} ${def.modelPrefix}-${size}`;
        if (existingModelNames.has(name)) return null;
        return [name, brand.brand_id, cat.category_id, null, randomItem(adminIds)];
      })
      .filter((r): r is unknown[] => r !== null);

    if (rows.length === 0) continue;

    await d1BatchInsert(
      "attachment_model",
      ["name", "brand_id", "category_id", "pdf_url", "created_by"],
      rows
    );
    total += rows.length;
  }
  if (total === 0) log(`  [skip] all attachment models exist`);
  else log(`  [add] ${total} attachment models (${existingModels.length} existed)`);
}

// ── 20. Users ──

async function seedUsers(adminIds: number[]): Promise<number[]> {
  stepHeader("Seeding app_user (50 users)...");
  const existing = await d1Query<{ app_user_id: number }>("SELECT app_user_id FROM app_user");
  if (existing.length >= 50) {
    log(`  [skip] ${existing.length} users exist`);
    return existing.map((c) => c.app_user_id);
  }

  const businessTypes = await d1Query<{ business_type_id: number }>(
    "SELECT business_type_id FROM business_type"
  );
  const btIds = businessTypes.map((b) => b.business_type_id);

  // Pre-hash password once for all users
  const passwordHash = await bcrypt.hash("customer123!", BCRYPT_ROUNDS);
  log(`  Hashed shared user password`);

  const existingEmails = new Set(
    (await d1Query<{ email: string }>("SELECT email FROM app_user")).map((r) => r.email)
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
    const companyName = randomInt(0, 1) === 1 ? randomItem(COMPANY_NAMES) : null;
    const officeAddress = companyName ? randomItem(OFFICE_ADDRESSES) : null;
    const businessTypeId = btIds.length > 0 ? randomItem(btIds) : null;

    await d1Execute(
      `INSERT INTO app_user (username, email, password_hash, phone, is_verified, company_name, office_address, business_type_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, phone, isVerified, companyName, officeAddress, businessTypeId]
    );

    const [cust] = await d1Query<{ app_user_id: number }>(
      "SELECT app_user_id FROM app_user WHERE email = ?",
      [email]
    );
    appUserIds.push(cust.app_user_id);
    inserted++;
  }

  log(`  [add] ${inserted} users (${appUserIds.length} total)`);
  return appUserIds;
}

// ── 21. Partners ──

async function seedPartners(appUserIds: number[]): Promise<number[]> {
  stepHeader("Seeding partner (20 approved + 30 pending)...");
  const existingPartners = await d1Query<{ id: number }>("SELECT id FROM partner");
  if (existingPartners.length >= 50) {
    log(`  [skip] ${existingPartners.length} partners exist`);
    // Return approved partner IDs
    const approved = await d1Query<{ id: number }>(
      "SELECT p.id FROM partner p JOIN partner_status_type pst ON p.status_id = pst.id WHERE pst.status_name = 'Approved'"
    );
    return approved.map((p) => p.id);
  }

  const partnerTypes = await d1Query<{ id: number }>("SELECT id FROM partner_type");
  const statuses = await d1Query<{ id: number; status_name: string }>(
    "SELECT id, status_name FROM partner_status_type"
  );
  const approvedStatusId = statuses.find((s) => s.status_name === "Approved")!.id;
  const pendingStatusId = statuses.find((s) => s.status_name === "Pending")!.id;

  // Get users that don't already have a partner entry
  const existingPartnerUsers = await d1Query<{ app_user_id: number }>(
    "SELECT app_user_id FROM partner"
  );
  const existingUserSet = new Set(existingPartnerUsers.map((p) => p.app_user_id));
  const availableUsers = appUserIds.filter((id) => !existingUserSet.has(id));

  const shuffled = shuffle(availableUsers);
  const toCreate = Math.min(50 - existingPartners.length, shuffled.length);

  const approvedPartnerIds: number[] = [];

  for (let i = 0; i < toCreate; i++) {
    const custId = shuffled[i];
    const typeId = randomItem(partnerTypes).id;
    const statusId = i < 20 ? approvedStatusId : pendingStatusId;

    await d1Execute(
      `INSERT INTO partner (app_user_id, partner_type_id, status_id) VALUES (?, ?, ?)`,
      [custId, typeId, statusId]
    );

    if (statusId === approvedStatusId) {
      const [p] = await d1Query<{ id: number }>(
        "SELECT id FROM partner WHERE app_user_id = ?",
        [custId]
      );
      approvedPartnerIds.push(p.id);
    }
  }

  // Also collect any pre-existing approved partners
  const allApproved = await d1Query<{ id: number }>(
    "SELECT p.id FROM partner p JOIN partner_status_type pst ON p.status_id = pst.id WHERE pst.status_name = 'Approved'"
  );

  log(`  [add] ${toCreate} partners (${Math.min(20, toCreate)} approved, ${Math.max(0, toCreate - 20)} pending)`);
  return allApproved.map((p) => p.id);
}

// ── 22. Custom Field Templates ──

async function seedCustomFieldTemplates(adminIds: number[]) {
  stepHeader("Seeding custom_field_template...");
  const count = await d1Count("custom_field_template");
  if (count > 0) { log(`  [skip] ${count} rows exist`); return; }

  for (const tmpl of CUSTOM_FIELD_TEMPLATES) {
    await d1Execute(
      "INSERT INTO custom_field_template (name, fields, created_by) VALUES (?, ?, ?)",
      [tmpl.name, JSON.stringify(tmpl.fields), randomItem(adminIds)]
    );
    log(`  [add] Template: "${tmpl.name}" (${tmpl.fields.length} fields)`);
  }
}

// ── 23. Product Lists + Sale Listings + Rent Listings ──

async function seedProductListsAndListings(
  approvedPartnerIds: number[],
  adminIds: number[]
) {
  stepHeader("Seeding product_list + sale_listing + rent_listing...");

  const saleCount = await d1Count("sale_listing");
  const rentCount = await d1Count("rent_listing");
  if (saleCount >= 100 && rentCount >= 100) {
    log(`  [skip] sale: ${saleCount}, rent: ${rentCount}`);
    return;
  }

  if (approvedPartnerIds.length === 0) {
    log(`  [warn] No approved partners found. Skipping listings.`);
    return;
  }

  // Fetch dependencies
  const townships = await d1Query<{ township_id: number }>("SELECT township_id FROM township");
  const equipModels = await d1Query<{ model_id: number }>("SELECT model_id FROM equipment_model");
  const attachModels = await d1Query<{ model_id: number }>("SELECT model_id FROM attachment_model");
  const conditionTypes = await d1Query<{ id: number }>("SELECT id FROM condition_type");

  if (equipModels.length === 0) {
    log(`  [warn] No equipment models found. Skipping listings.`);
    return;
  }
  if (townships.length === 0) {
    log(`  [warn] No townships found. Skipping listings.`);
    return;
  }
  const approvalStatuses = await d1Query<{ id: number; status_name: string }>(
    "SELECT id, status_name FROM approval_status_type"
  );

  const approvedId = approvalStatuses.find((s) => s.status_name === "Approved")!.id;
  const pendingApprovalId = approvalStatuses.find((s) => s.status_name === "Pending")!.id;
  const reworkId = approvalStatuses.find((s) => s.status_name === "Rework")!.id;

  const townshipIds = townships.map((t) => t.township_id);
  const equipIds = equipModels.map((m) => m.model_id);
  const attachIds = attachModels.map((m) => m.model_id);
  const conditionIds = conditionTypes.map((c) => c.id);

  // Helper to generate custom_fields JSON
  function generateCustomFields(): string {
    const year = randomInt(2015, 2025);
    const hours = randomInt(500, 15000);
    const weight = randomInt(3000, 45000);
    const hp = randomInt(50, 500);
    const fuelTypes = ["Diesel", "Diesel", "Diesel", "Diesel", "Gasoline", "Electric", "Hybrid"];
    return JSON.stringify([
      { key: "year", label: "Year of Manufacture", type: "number", value: String(year) },
      { key: "operating-hours", label: "Operating Hours", type: "number", value: String(hours) },
      { key: "operating-weight", label: "Operating Weight (kg)", type: "number", value: String(weight) },
      { key: "engine-power", label: "Engine Power (HP)", type: "number", value: String(hp) },
      { key: "fuel-type", label: "Fuel Type", type: "dropdown", value: randomItem(fuelTypes) },
    ]);
  }

  // Create 200 product_list entries (first 100 for sale, next 100 for rent)
  const totalListings = 200 - (saleCount + rentCount);
  const productListIds: number[] = [];

  log(`  Creating ${totalListings} product_list entries...`);

  for (let i = 0; i < totalListings; i++) {
    const partnerId = randomItem(approvedPartnerIds);
    const canUseAttachment = attachIds.length > 0;
    const useEquipment = !canUseAttachment || i % 4 !== 3; // 75% equipment, 25% attachment
    const equipModelId = useEquipment ? randomItem(equipIds) : null;
    const attachModelId = useEquipment ? null : randomItem(attachIds);
    const townshipId = randomItem(townshipIds);
    const description = randomItem(LISTING_DESCRIPTIONS);
    const customFields = generateCustomFields();
    const createdBy = randomItem(adminIds);
    const thumbnailUrl = `https://placehold.co/400x300/1a1a2e/ffffff?text=Equipment+${i + 1}`;

    await d1Execute(
      `INSERT INTO product_list (partner_id, equipment_model_id, attachment_model_id, custom_fields, description, thumbnail_url, township_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [partnerId, equipModelId, attachModelId, customFields, description, thumbnailUrl, townshipId, createdBy]
    );

    // Get the ID
    const [pl] = await d1Query<{ id: number }>(
      "SELECT id FROM product_list ORDER BY id DESC LIMIT 1"
    );
    productListIds.push(pl.id);

    // Add 1-3 product images per listing
    const numImages = randomInt(1, 3);
    for (let j = 0; j < numImages; j++) {
      await d1Execute(
        `INSERT INTO product_image (product_list_id, url, display_order, uploaded_by, active)
         VALUES (?, ?, ?, ?, 1)`,
        [
          pl.id,
          `https://placehold.co/800x600/1a1a2e/ffffff?text=Product+${pl.id}+Image+${j + 1}`,
          String(j),
          createdBy,
        ]
      );
    }

    if ((i + 1) % 50 === 0) log(`    ...${i + 1}/${totalListings} product lists created`);
  }
  log(`  [add] ${productListIds.length} product_list entries`);

  // Split into sale and rent
  const saleProductIds = productListIds.slice(0, 100);
  const rentProductIds = productListIds.slice(100, 200);

  // ── Sale Listings (60 approved, 30 pending, 10 rework) ──
  if (saleCount < 100) {
    log(`  Creating sale listings...`);
    const toAdd = 100 - saleCount;
    for (let i = 0; i < toAdd && i < saleProductIds.length; i++) {
      const plId = saleProductIds[i];
      let statusId: number;
      if (i < 60) statusId = approvedId;
      else if (i < 90) statusId = pendingApprovalId;
      else statusId = reworkId;

      const usdPrice = randomInt(5, 500) * 1000; // $5,000 - $500,000
      const mmkPrice = usdPrice * 3200;
      const conditionId = randomItem(conditionIds);
      const hidePrice = randomInt(0, 5) === 0 ? 1 : 0; // ~20% hidden
      const isHidden = randomInt(0, 9) === 0 ? 1 : 0; // ~10% hidden
      const isSoldOut = statusId === approvedId && randomInt(0, 9) === 0 ? 1 : 0; // ~10% of approved

      const rejectionReason = statusId === reworkId
        ? randomItem([
            "Insufficient product photos. Please upload at least 3 clear images.",
            "Price seems unrealistic for this equipment type. Please verify.",
            "Listing description does not match the selected equipment model.",
            "Duplicate listing detected. A similar listing already exists.",
          ])
        : null;

      const approvedBy = statusId === approvedId ? randomItem(adminIds) : null;
      const approvedAt = statusId === approvedId
        ? new Date(Date.now() - randomInt(1, 90) * 86400000).toISOString()
        : null;

      await d1Execute(
        `INSERT INTO sale_listing (custom_id, product_list_id, condition_type_id, mmk_price, usd_price, hide_price, is_hidden, is_sold_out, approved_by, approved_at, rejection_reason, approve_status_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `SL-${pad(i + 1)}`,
          plId,
          conditionId,
          mmkPrice,
          usdPrice,
          hidePrice,
          isHidden,
          isSoldOut,
          approvedBy,
          approvedAt,
          rejectionReason,
          statusId,
          randomItem(adminIds),
        ]
      );
    }
    log(`  [add] ${toAdd} sale listings (60 approved, 30 pending, 10 rework)`);
  }

  // ── Rent Listings (60 approved, 30 pending, 10 rework) ──
  if (rentCount < 100) {
    log(`  Creating rent listings...`);
    const toAdd = 100 - rentCount;
    for (let i = 0; i < toAdd && i < rentProductIds.length; i++) {
      const plId = rentProductIds[i];
      let statusId: number;
      if (i < 60) statusId = approvedId;
      else if (i < 90) statusId = pendingApprovalId;
      else statusId = reworkId;

      const usdPrice = randomInt(5, 500) * 100; // $500 - $50,000 /month
      const mmkPrice = usdPrice * 3200;
      const hidePrice = randomInt(0, 5) === 0 ? 1 : 0;
      const isHidden = randomInt(0, 9) === 0 ? 1 : 0;

      const rejectionReason = statusId === reworkId
        ? randomItem([
            "Rental terms are incomplete. Please specify minimum rental period.",
            "Equipment condition does not match the listing description.",
            "Missing valid partner certification for rental operations.",
            "Pricing is below market minimum. Please review rental rates.",
          ])
        : null;

      const approvedBy = statusId === approvedId ? randomItem(adminIds) : null;
      const approvedAt = statusId === approvedId
        ? new Date(Date.now() - randomInt(1, 90) * 86400000).toISOString()
        : null;

      await d1Execute(
        `INSERT INTO rent_listing (custom_id, product_list_id, mmk_price, usd_price, hide_price, is_hidden, approved_by, approved_at, rejection_reason, approve_status_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `RL-${pad(i + 1)}`,
          plId,
          mmkPrice,
          usdPrice,
          hidePrice,
          isHidden,
          approvedBy,
          approvedAt,
          rejectionReason,
          statusId,
          randomItem(adminIds),
        ]
      );
    }
    log(`  [add] ${toAdd} rent listings (60 approved, 30 pending, 10 rework)`);
  }
}

// ── 24. Featured Listings ──

async function seedFeaturedListings(adminIds: number[]) {
  stepHeader("Seeding featured_listing...");
  const count = await d1Count("featured_listing");
  if (count > 0) { log(`  [skip] ${count} rows exist`); return; }

  // Get approved sale and rent listings
  const approvedSale = await d1Query<{ id: number }>(
    "SELECT sl.id FROM sale_listing sl JOIN approval_status_type ast ON sl.approve_status_id = ast.id WHERE ast.status_name = 'Approved' LIMIT 8"
  );
  const approvedRent = await d1Query<{ id: number }>(
    "SELECT rl.id FROM rent_listing rl JOIN approval_status_type ast ON rl.approve_status_id = ast.id WHERE ast.status_name = 'Approved' LIMIT 7"
  );

  let order = 0;
  for (const sl of approvedSale) {
    await d1Execute(
      "INSERT INTO featured_listing (sale_listing_id, rent_listing_id, display_order, created_by) VALUES (?, NULL, ?, ?)",
      [sl.id, String(order++), randomItem(adminIds)]
    );
  }
  for (const rl of approvedRent) {
    await d1Execute(
      "INSERT INTO featured_listing (sale_listing_id, rent_listing_id, display_order, created_by) VALUES (NULL, ?, ?, ?)",
      [rl.id, String(order++), randomItem(adminIds)]
    );
  }
  log(`  [add] ${order} featured listings (${approvedSale.length} sale, ${approvedRent.length} rent)`);
}

// ── 25. Article Categories + Articles ──

async function seedArticles(adminIds: number[]) {
  stepHeader("Seeding article_category + article...");

  // Article Categories
  const catCount = await d1Count("article_category");
  if (catCount === 0) {
    const rows = ARTICLE_CATEGORIES.map((name) => [name, randomItem(adminIds)]);
    await d1BatchInsert("article_category", ["name", "created_by"], rows);
    log(`  [add] ${ARTICLE_CATEGORIES.length} article categories`);
  } else {
    log(`  [skip] ${catCount} article categories exist`);
  }

  // Articles
  const artCount = await d1Count("article");
  if (artCount > 0) {
    log(`  [skip] ${artCount} articles exist`);
    return;
  }

  const categories = await d1Query<{ category_id: number; name: string }>(
    "SELECT category_id, name FROM article_category"
  );
  const catIdMap = new Map(categories.map((c) => [c.name, c.category_id]));

  const articleStatuses = await d1Query<{ id: number; status_name: string }>(
    "SELECT id, status_name FROM article_status_type"
  );
  const statusIdMap = new Map(articleStatuses.map((s) => [s.status_name, s.id]));

  for (let i = 0; i < ARTICLES.length; i++) {
    const art = ARTICLES[i];
    const categoryId = catIdMap.get(art.category) ?? null;
    const statusId = statusIdMap.get(art.status) ?? null;
    const isPublished = art.status === "Published";
    const approvedBy = isPublished ? randomItem(adminIds) : null;
    const publishDate = isPublished
      ? new Date(Date.now() - randomInt(1, 180) * 86400000).toISOString()
      : null;
    const approvedAt = publishDate;
    const rejectionReason = art.status === "Rejected"
      ? "Content needs revision. Please improve the technical accuracy and add source citations."
      : null;

    await d1Execute(
      `INSERT INTO article (title, content, created_by, category_id, article_status_type_id, approved_by, approved_at, rejection_reason, publish_date, author_name, cover_image_url, estimated_read_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        art.title,
        art.content,
        randomItem(adminIds),
        categoryId,
        statusId,
        approvedBy,
        approvedAt,
        rejectionReason,
        publishDate,
        art.author_name,
        `https://placehold.co/800x450/1a1a2e/ffffff?text=${encodeURIComponent(art.title.slice(0, 30))}`,
        art.estimated_read_time,
      ]
    );
  }
  log(`  [add] ${ARTICLES.length} articles`);
}

// ── 26. Carousel + Carousel Images ──

async function seedCarousel(adminIds: number[]) {
  stepHeader("Seeding carousel + carousel_image (5 images)...");

  const carouselCount = await d1Count("carousel");
  let carouselId: number;

  if (carouselCount > 0) {
    const [c] = await d1Query<{ carousel_id: number }>("SELECT carousel_id FROM carousel LIMIT 1");
    carouselId = c.carousel_id;
    log(`  [skip] Carousel exists (carousel_id: ${carouselId})`);
  } else {
    await d1Execute(
      "INSERT INTO carousel (name, description) VALUES (?, ?)",
      ["Main Homepage Carousel", "Featured equipment and promotions displayed on the homepage"]
    );
    const [c] = await d1Query<{ carousel_id: number }>(
      "SELECT carousel_id FROM carousel WHERE name = 'Main Homepage Carousel'"
    );
    carouselId = c.carousel_id;
    log(`  [add] Carousel "Main Homepage Carousel" (carousel_id: ${carouselId})`);
  }

  // Carousel images
  const imgCount = await d1Count("carousel_image");
  if (imgCount >= 5) {
    log(`  [skip] ${imgCount} carousel images exist`);
    return;
  }

  const captions = [
    "Top Quality Construction Equipment",
    "Rent Heavy Machinery Nationwide",
    "Trusted Dealers Across Myanmar",
    "New Arrivals This Month",
    "Equipment Financing Available",
  ];

  for (let i = 0; i < 5; i++) {
    // Insert image record
    await d1Execute(
      "INSERT INTO image (image_url, uploaded_by) VALUES (?, ?)",
      [
        `https://placehold.co/1200x400/1a1a2e/ffffff?text=${encodeURIComponent(captions[i])}`,
        randomItem(adminIds),
      ]
    );
    const [img] = await d1Query<{ image_id: number }>(
      "SELECT image_id FROM image ORDER BY image_id DESC LIMIT 1"
    );

    // Link to carousel
    await d1Execute(
      "INSERT INTO carousel_image (carousel_id, image_id, display_order, added_by, active, link_url) VALUES (?, ?, ?, ?, 1, ?)",
      [carouselId, img.image_id, String(i), randomItem(adminIds), "/listings/for-sale"]
    );
  }
  log(`  [add] 5 carousel images`);
}

// ── 27. Announcements ──

async function seedAnnouncements(adminIds: number[]) {
  stepHeader("Seeding announcement_text (5 active)...");
  const count = await d1Count("announcement_text");
  if (count > 0) { log(`  [skip] ${count} rows exist`); return; }

  const rows = ANNOUNCEMENTS.map((text, i) => [text, 1, randomItem(adminIds), String(i)]);
  await d1BatchInsert(
    "announcement_text",
    ["text", "is_active", "created_by", "display_order"],
    rows
  );
  log(`  [add] ${ANNOUNCEMENTS.length} announcements`);
}

// ── 28. Enquiries ──

async function seedEnquiries(appUserIds: number[]) {
  stepHeader("Seeding enquiry (100 enquiries)...");
  const count = await d1Count("enquiry");
  if (count > 0) { log(`  [skip] ${count} rows exist`); return; }

  const statuses = await d1Query<{ id: number; status_name: string }>(
    "SELECT id, status_name FROM enquiry_status_type"
  );
  const pendingId = statuses.find((s) => s.status_name === "Pending")!.id;
  const resolvedId = statuses.find((s) => s.status_name === "Resolved")!.id;

  const saleListings = await d1Query<{ id: number }>("SELECT id FROM sale_listing LIMIT 50");
  const rentListings = await d1Query<{ id: number }>("SELECT id FROM rent_listing LIMIT 50");
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
    const statusId = i < 65 ? pendingId : resolvedId; // 65 pending, 35 resolved

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

  // Insert in batches of 10 (5 columns × 10 = 50 params per batch)
  await d1BatchInsert(
    "enquiry",
    ["sale_listing_id", "rent_listing_id", "app_user_id", "message", "enquiry_status_id"],
    rows,
    10
  );
  log(`  [add] 100 enquiries (65 pending, 35 resolved)`);
}

// ── 29. App Settings ──

async function seedAppSettings() {
  stepHeader("Seeding app_setting...");
  const count = await d1Count("app_setting");
  if (count > 0) { log(`  [skip] ${count} rows exist`); return; }

  for (const s of APP_SETTINGS) {
    await d1Execute(
      `INSERT INTO app_setting (setting_key, value) VALUES (?, ?) ON CONFLICT(setting_key) DO NOTHING`,
      [s.setting_key, s.value]
    );
  }
  log(`  [add] ${APP_SETTINGS.length} settings`);
}

// ── 30. Admin Activity Log ──

async function seedActivityLog(adminIds: number[]) {
  stepHeader("Seeding admin_activity_log (sample entries)...");
  const count = await d1Count("admin_activity_log");
  if (count > 0) { log(`  [skip] ${count} rows exist`); return; }

  const activities = [
    "Logged in to admin portal",
    "Created new sale listing SL-001",
    "Approved partner application #1",
    "Updated equipment model CAT 200",
    "Published article: Top Construction Equipment Trends",
    "Updated exchange rate to 3200 MMK/USD",
    "Created new role: Sales Manager",
    "Added 5 carousel images",
    "Resolved enquiry #1",
    "Rejected listing SL-099 — insufficient photos",
    "Added new brand: Caterpillar",
    "Updated announcement bar content",
    "Created new user support ticket response",
    "Exported monthly sales report",
    "Updated location database with new townships",
  ];

  const rows = activities.map((desc, i) => [
    adminIds[i % adminIds.length],
    desc,
  ]);
  await d1BatchInsert("admin_activity_log", ["user_id", "activity_description"], rows);
  log(`  [add] ${activities.length} activity log entries`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("  SHWELOADER — COMPREHENSIVE SEED SCRIPT");
  console.log("═".repeat(60));
  console.log(`  D1 API: ${D1_BASE_URL}`);
  console.log(`  Time:   ${new Date().toISOString()}\n`);

  if (!D1_API_TOKEN) {
    console.error("  ERROR: CLOUDFLARE_WORKER_API_TOKEN is not set.");
    console.error("  Run with: pnpm tsx --env-file=.env.local scripts/seed-all.ts");
    process.exit(1);
  }

  const startTime = Date.now();

  // 1-6. Lookup tables
  await seedPartnerTypes();
  await seedPartnerStatusTypes();
  await seedEnquiryStatusTypes();
  await seedApprovalStatusTypes();
  await seedArticleStatusTypes();
  await seedConditionTypes();

  // 7. RBAC
  await seedRBAC();

  // 8. Roles
  const roleIdMap = await seedRoles();

  // 9. Admin Users
  const adminIds = await seedAdminUsers(roleIdMap);

  // 10-12. Business Types, Locations, Brands
  await seedBusinessTypes(adminIds);
  await seedLocations(adminIds);
  await seedBrands(adminIds);

  // 13-16. Equipment taxonomy
  await seedEquipmentMainCategories(adminIds);
  await seedEquipmentSubCategories(adminIds);
  await seedEquipmentSubCategoryBrands(adminIds);
  await seedEquipmentModels(adminIds);

  // 17-19. Attachment taxonomy
  await seedAttachmentCategories(adminIds);
  await seedAttachmentCategoryBrands(adminIds);
  await seedAttachmentModels(adminIds);

  // 20. Users
  const appUserIds = await seedUsers(adminIds);

  // 21. Partners
  const approvedPartnerIds = await seedPartners(appUserIds);

  // 22. Custom Field Templates
  await seedCustomFieldTemplates(adminIds);

  // 23. Product Lists + Listings
  await seedProductListsAndListings(approvedPartnerIds, adminIds);

  // 24. Featured Listings
  await seedFeaturedListings(adminIds);

  // 25. Articles
  await seedArticles(adminIds);

  // 26-27. Carousel + Announcements
  await seedCarousel(adminIds);
  await seedAnnouncements(adminIds);

  // 28. Enquiries
  await seedEnquiries(appUserIds);

  // 29. App Settings
  await seedAppSettings();

  // 30. Activity Log
  await seedActivityLog(adminIds);

  // ── Summary ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "═".repeat(60));
  console.log("  SUMMARY");
  console.log("═".repeat(60));

  const tables = [
    "partner_type", "partner_status_type", "enquiry_status_type",
    "approval_status_type", "article_status_type", "condition_type",
    "permission", "feature", "feature_permission", "role", "role_permission",
    "admin_user", "business_type", "state_region", "district", "township", "product_brand",
    "equipment_main_category", "equipment_sub_category",
    "equipment_sub_category_brand", "equipment_model",
    "attachment_category", "attachment_category_brand", "attachment_model",
    "app_user", "partner", "custom_field_template",
    "product_list", "product_image", "sale_listing", "rent_listing",
    "featured_listing", "article_category", "article",
    "carousel", "carousel_image", "image", "announcement_text",
    "enquiry", "app_setting", "admin_activity_log",
  ];

  for (const table of tables) {
    const c = await d1Count(table);
    console.log(`  ${table.padEnd(32)} ${c}`);
  }

  console.log(`\n  Completed in ${elapsed}s`);
  console.log("  Seed complete!\n");
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
