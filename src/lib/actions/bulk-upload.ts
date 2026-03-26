"use server";

import {
  requirePermission,
  assertBulkLimit,
  getErrorMessage,
} from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getBulkUploadConfig } from "@/lib/bulk-upload/config";
import { generateTemplate } from "@/lib/bulk-upload/excel-template";
import { parseExcelFile } from "@/lib/bulk-upload/excel-parser";
import { validateCell, resolveValue } from "@/lib/bulk-upload/validators";
import {
  fetchLookupData,
  fetchAssociationData,
} from "@/lib/bulk-upload/lookups";
import { brandService } from "@/lib/services/brand";
import {
  stateRegionService,
  districtService,
  townshipService,
} from "@/lib/services/location";
import {
  mainCategoryService,
  subCategoryService,
  equipmentModelService,
} from "@/lib/services/equipment";
import {
  attachmentCategoryService,
  attachmentModelService,
} from "@/lib/services/attachment";
import { businessTypeService } from "@/lib/services/app-user";
import { announcementTextService } from "@/lib/services/announcement";
import { articleCategoryService } from "@/lib/services/article";
import { getNextDisplayOrder } from "@/lib/actions/reorder";
import { uploadToR2, slugify } from "@/lib/api/r2-client";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { auditLog } from "@/lib/actions/audit";
import type {
  BulkUploadConfig,
  ParsedRow,
  ImportResult,
  ImportRowResult,
  LookupData,
} from "@/types/bulk-upload";

// ─── Entity Key → Feature Name Mapping ────────────────────────────────────────

const ENTITY_FEATURE_MAP: Record<string, string> = {
  brands: "brands",
  "article-categories": "article_categories",
  "business-types": "business_types",
  announcements: "announcements",
  "state-regions": "locations",
  districts: "locations",
  locations: "locations",
  "equipment-main-categories": "equipment_main_categories",
  "equipment-sub-categories": "equipment_sub_categories",
  "attachment-categories": "attachment_categories",
  "attachment-models": "attachment_models",
  "equipment-models": "equipment_models",
  listings: "sale_listings",
};

function getFeatureForEntity(entityKey: string): string {
  const feature = ENTITY_FEATURE_MAP[entityKey];
  if (!feature) throw new Error(`Unknown entity key: ${entityKey}`);
  return feature;
}

function getBulkImportErrorMessage(error: unknown): string {
  const mapped = getErrorMessage(error, "");
  if (mapped) return mapped;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Import failed";
}

// ─── Template Download ────────────────────────────────────────────────────────

export async function downloadTemplate(entityKey: string): Promise<{
  success: boolean;
  data?: string;
  filename?: string;
  error?: string;
}> {
  try {
    await requirePermission(getFeatureForEntity(entityKey), "create");
    const config = getBulkUploadConfig(entityKey);
    const lookups = await fetchLookupData(config.lookupKeys);

    // Fetch association data for dependent dropdown columns
    const assocKeys = config.columns
      .filter((c) => c.dependsOn)
      .map((c) => c.dependsOn!.associationKey);
    const associations = await fetchAssociationData(assocKeys);

    const buffer = await generateTemplate(config, lookups, associations);

    return {
      success: true,
      data: buffer.toString("base64"),
      filename: `${config.entityKey}-template.xlsx`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate template",
    };
  }
}

// ─── Parse & Validate ─────────────────────────────────────────────────────────

export async function parseAndValidateExcel(
  entityKey: string,
  formData: FormData,
): Promise<{
  success: boolean;
  rows?: ParsedRow[];
  lookups?: LookupData;
  error?: string;
}> {
  try {
    await requirePermission(getFeatureForEntity(entityKey), "create");
    const config = getBulkUploadConfig(entityKey);

    const file = formData.get("file") as File;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided" };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "File too large (max 5MB)" };
    }

    const lookups = await fetchLookupData(config.lookupKeys);
    const rawRows = await parseExcelFile(file, config);

    if (rawRows.length === 0) {
      return { success: false, error: "No data rows found in the Excel file" };
    }
    if (rawRows.length > config.maxRows) {
      return {
        success: false,
        error: `Too many rows (${rawRows.length}). Maximum is ${config.maxRows}`,
      };
    }

    // Per-cell validation
    const parsedRows: ParsedRow[] = rawRows.map((data, idx) => {
      const errors = config.columns
        .map((col) => validateCell(data[col.field], col, idx + 1, lookups))
        .filter((e): e is NonNullable<typeof e> => e !== null);

      return {
        rowIndex: idx + 1,
        data,
        errors,
        images: {},
        status: errors.length > 0 ? "error" : "valid",
      };
    });

    // Cross-row duplicate detection on unique text fields (e.g. brand name)
    const textColumns = config.columns.filter(
      (c) => c.type === "text" && c.required,
    );
    for (const col of textColumns) {
      const seen = new Map<string, number>();
      for (const row of parsedRows) {
        const val = String(row.data[col.field] ?? "")
          .trim()
          .toLowerCase();
        if (!val) continue;
        const prevRow = seen.get(val);
        if (prevRow !== undefined) {
          row.errors.push({
            row: row.rowIndex,
            column: col.header,
            message: `Duplicate "${row.data[col.field]}" (same as row ${prevRow})`,
          });
          row.status = "error";
        } else {
          seen.set(val, row.rowIndex);
        }
      }
    }

    return { success: true, rows: parsedRows, lookups };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to parse Excel file",
    };
  }
}

// ─── Bulk Import ──────────────────────────────────────────────────────────────

export async function processBulkImport(
  entityKey: string,
  rows: ParsedRow[],
): Promise<ImportResult> {
  const userId = await requirePermission(
    getFeatureForEntity(entityKey),
    "create",
  );
  const config = getBulkUploadConfig(entityKey);

  // Only process valid rows
  const validRows = rows.filter((r) => r.status === "valid");
  if (validRows.length === 0) {
    return {
      total: rows.length,
      succeeded: 0,
      failed: 0,
      skipped: rows.length,
      rows: [],
    };
  }
  assertBulkLimit(validRows);

  const lookups = await fetchLookupData(config.lookupKeys);
  const batchSize = entityKey === "listings" ? 3 : 5;

  const results: ImportRowResult[] = [];
  let succeeded = 0;
  let failed = 0;
  const skipped = rows.length - validRows.length;

  // Add skipped rows to results
  for (const row of rows) {
    if (row.status === "error") {
      results.push({
        rowIndex: row.rowIndex,
        status: "skipped",
        error: row.errors.map((e) => e.message).join("; "),
      });
    }
  }

  // Process valid rows in batches
  for (let i = 0; i < validRows.length; i += batchSize) {
    const batch = validRows.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((row) => processRow(entityKey, row, lookups, userId)),
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const rowResult: ImportRowResult = {
        rowIndex: batch[j].rowIndex,
        status: result.status === "fulfilled" ? "success" : "error",
        error:
          result.status === "rejected"
            ? getBulkImportErrorMessage(result.reason)
            : undefined,
        createdId: result.status === "fulfilled" ? result.value : undefined,
      };
      results.push(rowResult);
      if (rowResult.status === "success") succeeded++;
      else failed++;
    }
  }

  // Invalidate cache tags
  for (const tag of config.cacheTags) {
    invalidateTag(tag as Parameters<typeof invalidateTag>[0]);
  }

  auditLog(userId, "bulk imported " + entityKey + " | succeeded=" + succeeded + " | failed=" + failed);

  // Sort results by rowIndex
  results.sort((a, b) => a.rowIndex - b.rowIndex);

  return {
    total: rows.length,
    succeeded,
    failed,
    skipped,
    rows: results,
  };
}

// ─── Bulk Import with Images ──────────────────────────────────────────────────

/**
 * Import rows with images via FormData.
 * Files are keyed as `image_{rowIndex}_{fieldName}_{fileIndex}`.
 * Rows data is JSON-encoded in the `rows` field.
 */
export async function processBulkImportWithImages(
  entityKey: string,
  formData: FormData,
): Promise<ImportResult> {
  const userId = await requirePermission(
    getFeatureForEntity(entityKey),
    "create",
  );
  const config = getBulkUploadConfig(entityKey);

  // Parse rows from FormData
  const rowsJson = formData.get("rows") as string;
  const rows: ParsedRow[] = JSON.parse(rowsJson);

  const validRows = rows.filter((r) => r.status === "valid");
  if (validRows.length === 0) {
    return {
      total: rows.length,
      succeeded: 0,
      failed: 0,
      skipped: rows.length,
      rows: [],
    };
  }
  assertBulkLimit(validRows);

  const lookups = await fetchLookupData(config.lookupKeys);
  const batchSize = entityKey === "listings" ? 3 : 5;

  // Extract image files from FormData
  const imageMap = new Map<number, Record<string, File[]>>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("image_") || !(value instanceof File)) continue;
    // key format: image_{rowIndex}_{fieldName}_{fileIndex}
    const parts = key.split("_");
    const rowIndex = Number(parts[1]);
    const fieldName = parts.slice(2, -1).join("_");
    if (!imageMap.has(rowIndex)) imageMap.set(rowIndex, {});
    const rowImages = imageMap.get(rowIndex)!;
    if (!rowImages[fieldName]) rowImages[fieldName] = [];
    rowImages[fieldName].push(value);
  }

  const results: ImportRowResult[] = [];
  let succeeded = 0;
  let failed = 0;
  const skipped = rows.length - validRows.length;

  for (const row of rows) {
    if (row.status === "error") {
      results.push({
        rowIndex: row.rowIndex,
        status: "skipped",
        error: row.errors.map((e) => e.message).join("; "),
      });
    }
  }

  // Process valid rows in batches
  for (let i = 0; i < validRows.length; i += batchSize) {
    const batch = validRows.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (row) => {
        // Upload images first, get R2 URLs
        const rowImages = imageMap.get(row.rowIndex) ?? {};
        const imageUrls: Record<string, string | string[]> = {};

        for (const field of config.imageFields ?? []) {
          const files = rowImages[field.field] ?? [];
          if (files.length === 0) continue;

          if (field.maxPerRow === 1) {
            // Single file: upload and store URL string
            const file = files[0];
            const url = await uploadBulkFile(file, field.r2Path, row, config);
            if (url) imageUrls[field.field] = url;
          } else {
            // Multiple files: upload all and store URL array
            const urls: string[] = [];
            for (const file of files) {
              const url = await uploadBulkFile(file, field.r2Path, row, config);
              if (url) urls.push(url);
            }
            if (urls.length > 0) imageUrls[field.field] = urls;
          }
        }

        return processRow(entityKey, row, lookups, userId, imageUrls);
      }),
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const rowResult: ImportRowResult = {
        rowIndex: batch[j].rowIndex,
        status: result.status === "fulfilled" ? "success" : "error",
        error:
          result.status === "rejected"
            ? getBulkImportErrorMessage(result.reason)
            : undefined,
        createdId: result.status === "fulfilled" ? result.value : undefined,
      };
      results.push(rowResult);
      if (rowResult.status === "success") succeeded++;
      else failed++;
    }
  }

  for (const tag of config.cacheTags) {
    invalidateTag(tag as Parameters<typeof invalidateTag>[0]);
  }

  auditLog(userId, "bulk imported " + entityKey + " with images | succeeded=" + succeeded + " | failed=" + failed);

  results.sort((a, b) => a.rowIndex - b.rowIndex);

  return {
    total: rows.length,
    succeeded,
    failed,
    skipped,
    rows: results,
  };
}

/** Upload a file to R2 for bulk import. Returns the R2 key. */
async function uploadBulkFile(
  file: File,
  r2Path: string,
  row: ParsedRow,
  config: BulkUploadConfig,
): Promise<string | null> {
  try {
    const isPdf = file.type === "application/pdf";
    let blob: Blob;
    let ext: string;

    if (isPdf) {
      blob = file;
      ext = ".pdf";
    } else {
      // Dynamic import sharp for image conversion
      const sharp = (await import("sharp")).default;
      const buffer = Buffer.from(await file.arrayBuffer());
      const webpBuffer = await sharp(buffer, {
        limitInputPixels: 100_000_000,
        sequentialRead: true,
      })
        .webp({ quality: 80 })
        .toBuffer();
      blob = new Blob([new Uint8Array(webpBuffer)], { type: "image/webp" });
      ext = ".webp";
    }

    const textCol = config.columns.find((c) => c.type === "text");
    const entityName = textCol
      ? String(row.data[textCol.field] ?? `row-${row.rowIndex}`)
      : `row-${row.rowIndex}`;
    const entityBase = slugify(entityName) || `row-${row.rowIndex}`;
    const originalBase = slugify(file.name.replace(/\.[^.]+$/, "")) || "file";
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${entityBase}-${originalBase}-${uniqueSuffix}${ext}`;
    const result = await uploadToR2(blob, r2Path, filename);
    return result.key;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    throw new Error(
      `Failed uploading file "${file.name}" for row ${row.rowIndex}: ${message}`,
    );
  }
}

// ─── Row Processors ───────────────────────────────────────────────────────────

async function processRow(
  entityKey: string,
  row: ParsedRow,
  lookups: LookupData,
  userId: number,
  imageUrls?: Record<string, string | string[]>,
): Promise<number> {
  const config = getBulkUploadConfig(entityKey);

  // Resolve all values to DB-ready format
  const resolved: Record<string, unknown> = {};
  for (const col of config.columns) {
    resolved[col.field] = resolveValue(row.data[col.field], col, lookups);
  }

  // Merge image URLs into resolved data
  if (imageUrls) {
    for (const [field, url] of Object.entries(imageUrls)) {
      resolved[field] = url;
    }
  }

  switch (entityKey) {
    case "brands":
      return createBrandRow(resolved, userId);
    case "article-categories":
      return createArticleCategoryRow(resolved, userId);
    case "business-types":
      return createBusinessTypeRow(resolved, userId);
    case "announcements":
      return createAnnouncementRow(resolved, userId);
    case "state-regions":
      return createStateRegionRow(resolved, userId);
    case "districts":
      return createDistrictRow(resolved, userId);
    case "locations":
      return createTownshipRow(resolved, userId);
    case "equipment-main-categories":
      return createEquipmentMainCategoryRow(resolved, userId);
    case "equipment-sub-categories":
      return createEquipmentSubCategoryRow(resolved, userId);
    case "attachment-categories":
      return createAttachmentCategoryRow(resolved, userId);
    case "attachment-models":
      return createAttachmentModelRow(resolved, userId);
    case "equipment-models":
      return createEquipmentModelRow(resolved, userId);
    case "listings":
      return createListingRow(resolved, lookups, userId);
    default:
      throw new Error(`Bulk import not implemented for: ${entityKey}`);
  }
}

// ─── Individual Row Creators ─────────────────────────────────────────────────

async function createBrandRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();

  await brandService.create({ name, created_by: userId });

  const result = await d1.query<{ brand_id: number }>(
    "SELECT brand_id FROM product_brand WHERE name = ?",
    [name],
  );
  const brandId = result.results[0]?.brand_id;
  if (!brandId) throw new Error(`Failed to retrieve brand ID for "${name}"`);

  const categoryIds = data.categoryIds as number[] | null;
  if (categoryIds && categoryIds.length > 0) {
    for (const categoryId of categoryIds) {
      await d1.query(
        "INSERT INTO attachment_category_brand (category_id, brand_id, created_by) VALUES (?, ?, ?)",
        [categoryId, brandId, userId],
      );
    }
  }

  const subCategoryIds = data.subCategoryIds as number[] | null;
  if (subCategoryIds && subCategoryIds.length > 0) {
    for (const subCategoryId of subCategoryIds) {
      await d1.query(
        "INSERT INTO equipment_sub_category_brand (sub_category_id, brand_id, created_by) VALUES (?, ?, ?)",
        [subCategoryId, brandId, userId],
      );
    }
  }

  return brandId;
}

async function createArticleCategoryRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  await articleCategoryService.create({ name, created_by: userId });

  const result = await d1.query<{ category_id: number }>(
    "SELECT category_id FROM article_category WHERE name = ?",
    [name],
  );
  return result.results[0]?.category_id ?? 0;
}

async function createBusinessTypeRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  await businessTypeService.create({ name, is_listed: 1, created_by: userId });

  const result = await d1.query<{ business_type_id: number }>(
    "SELECT business_type_id FROM business_type WHERE name = ?",
    [name],
  );
  return result.results[0]?.business_type_id ?? 0;
}

async function createAnnouncementRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const text = String(data.text).trim();
  const display_order = await getNextDisplayOrder("announcement_text");
  await announcementTextService.create({
    text,
    is_active: 1,
    created_by: userId,
    display_order,
  });

  const result = await d1.query<{ announcement_id: number }>(
    "SELECT announcement_id FROM announcement_text WHERE text = ? ORDER BY announcement_id DESC LIMIT 1",
    [text],
  );
  return result.results[0]?.announcement_id ?? 0;
}

async function createStateRegionRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  const type = String(data.type) as "state" | "region" | "union_territory";
  await stateRegionService.create({ name, type, created_by: userId });

  const result = await d1.query<{ state_region_id: number }>(
    "SELECT state_region_id FROM state_region WHERE name = ?",
    [name],
  );
  return result.results[0]?.state_region_id ?? 0;
}

async function createDistrictRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  const stateRegionId = data.state_region_id as number;
  await districtService.create({
    name,
    state_region_id: stateRegionId,
    created_by: userId,
  });

  const result = await d1.query<{ district_id: number }>(
    "SELECT district_id FROM district WHERE name = ? AND state_region_id = ?",
    [name, stateRegionId],
  );
  return result.results[0]?.district_id ?? 0;
}

async function createTownshipRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  const districtId = data.district_id as number;
  await townshipService.create({
    name,
    district_id: districtId,
    created_by: userId,
  });

  const result = await d1.query<{ township_id: number }>(
    "SELECT township_id FROM township WHERE name = ? AND district_id = ?",
    [name, districtId],
  );
  return result.results[0]?.township_id ?? 0;
}

async function createEquipmentMainCategoryRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  const imageUrl = (data.image_url as string) || null;
  const display_order = await getNextDisplayOrder("equipment_main_category");
  await mainCategoryService.create({
    name,
    image_url: imageUrl,
    created_by: userId,
    display_order,
  });

  const result = await d1.query<{ category_id: number }>(
    "SELECT category_id FROM equipment_main_category WHERE name = ?",
    [name],
  );
  return result.results[0]?.category_id ?? 0;
}

async function createEquipmentSubCategoryRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  const categoryId = data.category_id as number;
  const imageUrl = (data.image_url as string) || null;
  const display_order = await getNextDisplayOrder("equipment_sub_category");
  await subCategoryService.create({
    name,
    category_id: categoryId,
    image_url: imageUrl,
    created_by: userId,
    display_order,
  });

  const result = await d1.query<{ sub_category_id: number }>(
    "SELECT sub_category_id FROM equipment_sub_category WHERE name = ? AND category_id = ?",
    [name, categoryId],
  );
  return result.results[0]?.sub_category_id ?? 0;
}

async function createAttachmentCategoryRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  const imageUrl = (data.image_url as string) || null;
  const display_order = await getNextDisplayOrder("attachment_category");
  await attachmentCategoryService.create({
    name,
    image_url: imageUrl,
    created_by: userId,
    display_order,
  });

  const result = await d1.query<{ category_id: number }>(
    "SELECT category_id FROM attachment_category WHERE name = ?",
    [name],
  );
  return result.results[0]?.category_id ?? 0;
}

async function createAttachmentModelRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  const categoryId = data.category_id as number;
  const brandId = data.brand_id as number | null;
  await attachmentModelService.create({
    name,
    category_id: categoryId,
    brand_id: brandId,
    created_by: userId,
  });

  const result = await d1.query<{ model_id: number }>(
    "SELECT model_id FROM attachment_model WHERE name = ? AND category_id = ?",
    [name, categoryId],
  );
  return result.results[0]?.model_id ?? 0;
}

async function createEquipmentModelRow(
  data: Record<string, unknown>,
  userId: number,
): Promise<number> {
  const name = String(data.name).trim();
  const subCategoryId = data.sub_category_id as number;
  const brandId = data.brand_id as number | null;
  const pdfUrl = (data.pdf_url as string) || null;
  await equipmentModelService.create({
    name,
    sub_category_id: subCategoryId,
    brand_id: brandId,
    pdf_url: pdfUrl,
    created_by: userId,
  });

  const result = await d1.query<{ model_id: number }>(
    "SELECT model_id FROM equipment_model WHERE name = ? AND sub_category_id = ?",
    [name, subCategoryId],
  );
  return result.results[0]?.model_id ?? 0;
}

async function createListingRow(
  data: Record<string, unknown>,
  lookups: LookupData,
  userId: number,
): Promise<number> {
  const productType = data.product_type as string;
  const listingType = data.listing_type as string;
  const modelId = data.model_name as number;
  const partnerId = data.partner_id as number;
  const conditionTypeId = data.condition_type as number | null;
  const townshipId = data.township as number | null;
  const description = data.description as string | null;
  const hidePrice = data.hide_price as number | null;
  const hidePartner = data.hide_partner as number | null;
  const isHidden = data.is_hidden as number | null;
  const thumbnailUrl = data.thumbnail_url as string | null;

  // Build custom_fields JSON from name-value column pairs
  const customFieldEntries: { key: string; label: string; type: string; value: string }[] =
    [];
  for (let i = 1; i <= 5; i++) {
    const name = data[`cf_${i}_name`] as string | null;
    const value = data[`cf_${i}_value`] as string | null;
    if (name?.trim() && value?.trim()) {
      const label = name.trim();
      const key = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      customFieldEntries.push({ key, label, type: "text", value: value.trim() });
    }
  }
  const customFields =
    customFieldEntries.length > 0 ? JSON.stringify(customFieldEntries) : null;
  const productImages = data.product_images as string | string[] | null;

  // Separate sale/rent prices and display currency
  const saleMmkPrice = data.sale_mmk_price as number | null;
  const saleUsdPrice = data.sale_usd_price as number | null;
  const rentMmkPrice = data.rent_mmk_price as number | null;
  const rentUsdPrice = data.rent_usd_price as number | null;
  const saleDisplayCurrency = (data.sale_display_currency as string) || "MMK";
  const rentDisplayCurrency = (data.rent_display_currency as string) || "MMK";

  // 1. Create product_list
  const { productListService } = await import("@/lib/services/listing");
  await productListService.create({
    partner_id: partnerId,
    equipment_model_id: productType === "equipment" ? modelId : null,
    attachment_model_id: productType === "attachment" ? modelId : null,
    description: description?.trim() || null,
    thumbnail_url: thumbnailUrl,
    township_id: townshipId,
    hide_partner: hidePartner ?? 0,
    custom_fields: customFields?.trim() || null,
    created_by: userId,
  });

  const plResult = await d1.query<{ id: number }>(
    "SELECT id FROM product_list ORDER BY id DESC LIMIT 1",
  );
  const productId = plResult.results[0]?.id;
  if (!productId) throw new Error("Failed to create product list");

  // 2. Insert product images if provided
  if (productImages) {
    const imageKeys = Array.isArray(productImages)
      ? productImages
      : [productImages];
    const { productImageService } = await import("@/lib/services/listing");
    for (let i = 0; i < imageKeys.length; i++) {
      await productImageService.create({
        product_list_id: productId,
        url: imageKeys[i],
        display_order: String(i),
        uploaded_by: userId,
        active: 1,
        focal_x: 0.5,
        focal_y: 0.5,
      });
    }
  }

  // 3. Generate unique listing IDs and create listings
  const forSale = listingType === "sale" || listingType === "both";
  const forRent = listingType === "rent" || listingType === "both";
  const pType = productType as "equipment" | "attachment";

  if (forSale) {
    const customId = await generateBulkListingId("sale", pType);
    const { saleListingService } = await import("@/lib/services/listing");
    await saleListingService.create({
      product_list_id: productId,
      custom_id: customId,
      condition_type_id: conditionTypeId,
      mmk_price: saleMmkPrice,
      usd_price: saleUsdPrice,
      hide_price: hidePrice ?? 0,
      is_hidden: isHidden ?? 0,
      is_sold_out: 0,
      display_currency: saleDisplayCurrency,
      created_by: userId,
    });
  }

  if (forRent) {
    const customId = await generateBulkListingId("rent", pType);
    const { rentListingService } = await import("@/lib/services/listing");
    await rentListingService.create({
      product_list_id: productId,
      custom_id: customId,
      mmk_price: rentMmkPrice,
      usd_price: rentUsdPrice,
      hide_price: hidePrice ?? 0,
      is_hidden: isHidden ?? 0,
      is_rented: 0,
      display_currency: rentDisplayCurrency,
      created_by: userId,
    });
  }

  return productId;
}

// ─── Listing ID Helper ───────────────────────────────────────────────────────

const ID_CHARSET = "0123456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomIdSuffix(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ID_CHARSET[b % ID_CHARSET.length]).join("");
}

function getIdPrefix(
  listingType: "sale" | "rent",
  productType: "equipment" | "attachment",
): string {
  if (listingType === "sale" && productType === "equipment") return "SLE";
  if (listingType === "sale" && productType === "attachment") return "SLA";
  if (listingType === "rent" && productType === "equipment") return "RLE";
  return "RLA";
}

async function generateBulkListingId(
  listingType: "sale" | "rent",
  productType: "equipment" | "attachment",
): Promise<string> {
  const prefix = getIdPrefix(listingType, productType);
  const table = listingType === "sale" ? "sale_listing" : "rent_listing";

  for (let attempt = 0; attempt < 3; attempt++) {
    const suffix = randomIdSuffix(6);
    const candidate = `${prefix}-${suffix}`;
    const existing = await d1.query<{ custom_id: string }>(
      `SELECT custom_id FROM ${table} WHERE custom_id = ? LIMIT 1`,
      [candidate],
    );
    if (existing.results.length === 0) return candidate;
  }
  throw new Error("Failed to generate unique listing ID after 3 attempts");
}
