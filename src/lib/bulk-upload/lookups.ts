import {
  getBrands,
  getSubCategories,
  getMainCategories,
  getAttachmentCategories,
  getEquipmentModels,
  getAttachmentModels,
  getTownships,
  getApprovedPartners,
  getConditionTypes,
  getDistricts,
  getStateRegions,
} from "@/lib/cache";
import { d1 } from "@/lib/api/d1-client";
import type { LookupData } from "@/types/bulk-upload";

/** Parent label → list of associated child labels */
export type AssociationMap = Record<string, string[]>;

type LookupFetcher = () => Promise<{ label: string; value: number }[]>;

const LOOKUP_FETCHERS: Record<string, LookupFetcher> = {
  brands: async () => {
    const brands = await getBrands();
    return brands.map((b) => ({ label: b.name, value: b.brand_id }));
  },

  attachmentCategories: async () => {
    const cats = await getAttachmentCategories();
    return cats.map((c) => ({ label: c.name, value: c.category_id }));
  },

  equipmentSubCategories: async () => {
    const subs = await getSubCategories();
    return subs.map((s) => ({ label: s.name, value: s.sub_category_id }));
  },

  equipmentMainCategories: async () => {
    const mains = await getMainCategories();
    return mains.map((m) => ({ label: m.name, value: m.category_id }));
  },

  allModels: async () => {
    const [eqModels, atModels] = await Promise.all([
      getEquipmentModels(),
      getAttachmentModels(),
    ]);
    return [
      ...eqModels.map((m) => ({
        label: `[EQ] ${m.name}`,
        value: m.model_id,
      })),
      ...atModels.map((m) => ({
        label: `[AT] ${m.name}`,
        value: m.model_id,
      })),
    ];
  },

  approvedPartners: async () => {
    const partners = await getApprovedPartners();
    return partners.map((p) => ({
      label: p.user_name || p.company_name || `Partner #${p.id}`,
      value: p.id,
    }));
  },

  conditionTypes: async () => {
    const types = await getConditionTypes();
    return types.map((t) => ({ label: t.name, value: t.id }));
  },

  townships: async () => {
    const townships = await getTownships();
    return townships.map((t) => ({ label: t.name, value: t.township_id }));
  },

  stateRegions: async () => {
    const stateRegions = await getStateRegions();
    return stateRegions.map((sr) => ({ label: sr.name, value: sr.state_region_id }));
  },

  districts: async () => {
    const [districts, stateRegions] = await Promise.all([
      getDistricts(),
      getStateRegions(),
    ]);
    const regionMap = new Map(
      stateRegions.map((sr) => [sr.state_region_id, sr.name]),
    );
    return districts.map((d) => ({
      label: `${d.name} (${regionMap.get(d.state_region_id) ?? "Unknown"})`,
      value: d.district_id,
    }));
  },
};

/**
 * Fetch lookup data for the given keys.
 * Each key maps to a DB query via the cache layer.
 */
export async function fetchLookupData(
  lookupKeys: string[],
): Promise<LookupData> {
  const entries = await Promise.all(
    lookupKeys.map(async (key) => {
      const fetcher = LOOKUP_FETCHERS[key];
      if (!fetcher) throw new Error(`Unknown lookup key: ${key}`);
      const data = await fetcher();
      return [key, data] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// ─── Association Fetchers (for dependent dropdowns) ──────────────────────────

const ASSOCIATION_FETCHERS: Record<string, () => Promise<AssociationMap>> = {
  brandsByEquipmentSubCategory: async () => {
    const result = await d1.query<{ parent: string; child: string }>(
      `SELECT sc.name AS parent, b.name AS child
       FROM equipment_sub_category_brand scb
       JOIN equipment_sub_category sc ON scb.sub_category_id = sc.sub_category_id
       JOIN product_brand b ON scb.brand_id = b.brand_id
       WHERE sc.deleted_at IS NULL AND b.deleted_at IS NULL
       ORDER BY sc.name, b.name`,
    );
    return groupByParent(result.results);
  },

  brandsByAttachmentCategory: async () => {
    const result = await d1.query<{ parent: string; child: string }>(
      `SELECT ac.name AS parent, b.name AS child
       FROM attachment_category_brand acb
       JOIN attachment_category ac ON acb.category_id = ac.category_id
       JOIN product_brand b ON acb.brand_id = b.brand_id
       WHERE ac.deleted_at IS NULL AND b.deleted_at IS NULL
       ORDER BY ac.name, b.name`,
    );
    return groupByParent(result.results);
  },

  districtsByStateRegion: async () => {
    const result = await d1.query<{ parent: string; child: string }>(
      `SELECT sr.name AS parent, d.name || ' (' || sr.name || ')' AS child
       FROM district d
       JOIN state_region sr ON d.state_region_id = sr.state_region_id
       WHERE d.deleted_at IS NULL AND sr.deleted_at IS NULL
       ORDER BY sr.name, d.name`,
    );
    return groupByParent(result.results);
  },

  townshipsByDistrict: async () => {
    const [districts, stateRegions, townships] = await Promise.all([
      getDistricts(),
      getStateRegions(),
      getTownships(),
    ]);
    const regionMap = new Map(
      stateRegions.map((sr) => [sr.state_region_id, sr.name]),
    );
    // Build parent label (same format as districts lookup) → child township names
    const map: AssociationMap = {};
    for (const t of townships) {
      const district = districts.find((d) => d.district_id === t.district_id);
      if (!district) continue;
      const parentLabel = `${district.name} (${regionMap.get(district.state_region_id) ?? "Unknown"})`;
      if (!map[parentLabel]) map[parentLabel] = [];
      map[parentLabel].push(t.name);
    }
    return map;
  },
};

function groupByParent(rows: { parent: string; child: string }[]): AssociationMap {
  const map: AssociationMap = {};
  for (const row of rows) {
    if (!map[row.parent]) map[row.parent] = [];
    map[row.parent].push(row.child);
  }
  return map;
}

/**
 * Fetch association data for dependent dropdown columns.
 */
export async function fetchAssociationData(
  keys: string[],
): Promise<Record<string, AssociationMap>> {
  if (keys.length === 0) return {};
  const entries = await Promise.all(
    keys.map(async (key) => {
      const fetcher = ASSOCIATION_FETCHERS[key];
      if (!fetcher) throw new Error(`Unknown association key: ${key}`);
      return [key, await fetcher()] as const;
    }),
  );
  return Object.fromEntries(entries);
}
