"use server";

import {
  productListService,
  productImageService,
  saleListingService,
  rentListingService,
  featuredListingService,
} from "@/lib/services/listing";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getLastDisplayOrder, getNextDisplayOrder } from "@/lib/actions/reorder";
import { nKeysBetween } from "@/lib/utils/display-order";
import {
  processFileField,
  processImageFieldRich,
  deleteFile,
  cleanupOldFile,
} from "@/lib/actions/upload-helpers";
import { isR2Key, slugify } from "@/lib/api/r2-client";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  FeaturedListingRow,
  FeaturedListingWithDetails,
  DraftListingWithDetails,
  ProductImage,
  ListingDetail,
  RentalUnit,
} from "@/types/listing";
import { requireAuth } from "@/lib/actions/utils";
import { getCachedPermissionsForRole } from "@/lib/cache";
import { auth } from "@/lib/auth";
import {
  notifyListingSubmitted,
  notifyListingApproved,
  notifyListingRework,
} from "@/lib/actions/notification";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";

// ─── Helper: process product photos from form data ──────────────────────────

/**
 * Process product photos from FormData.
 * - `photo_url_N`: existing R2 keys to keep (edit mode)
 * - `photo_pending_key_N` + `photo_thumb_pending_key_N` + `photo_blurhash_N`:
 *   newly added photos that the browser already direct-uploaded to `pending/`.
 *   Server commits these to the final prefix.
 * - `photo_file_N`: legacy server-side upload path (kept for non-browser callers).
 * - `photo_focal_x_N` / `photo_focal_y_N`: optional focal point (0–1).
 * Returns array of processed photos in submitted order.
 */
type ProcessedPhoto = {
  key: string;
  /** Non-null for freshly uploaded photos (committed from pending/); existing
   *  entries inherit the thumb+blurhash already stored in product_image
   *  during syncProductImages. */
  thumbKey: string | null;
  blurhash: string | null;
  focalX: number | null;
  focalY: number | null;
};

async function processProductPhotos(
  formData: FormData,
  productListId: number,
): Promise<ProcessedPhoto[]> {
  // Flat prefix — the R2 worker's allowlist only accepts `products/photos/`
  // (no subdirectory). Filenames are uniquely generated on commit, so listings
  // don't collide. productListId is still used by callers for D1 wiring.
  void productListId;
  const r2Path = `products/photos/`;

  type PhotoEntry =
    | { type: "url"; url: string; focalX: number | null; focalY: number | null }
    | {
        type: "pending";
        pendingKey: string;
        thumbPendingKey: string | null;
        blurhash: string | null;
        focalX: number | null;
        focalY: number | null;
      }
    | { type: "file"; file: File; focalX: number | null; focalY: number | null };
  const entries: PhotoEntry[] = [];
  let i = 0;

  while (
    formData.has(`photo_url_${i}`) ||
    formData.has(`photo_file_${i}`) ||
    formData.has(`photo_pending_key_${i}`)
  ) {
    const fxRaw = formData.get(`photo_focal_x_${i}`);
    const fyRaw = formData.get(`photo_focal_y_${i}`);
    const focalX = fxRaw != null ? parseFloat(fxRaw as string) : null;
    const focalY = fyRaw != null ? parseFloat(fyRaw as string) : null;

    const existingKey = formData.get(`photo_url_${i}`) as string | null;
    const pendingKey = formData.get(`photo_pending_key_${i}`) as string | null;

    if (existingKey?.trim()) {
      if (!isR2Key(existingKey.trim())) {
        throw new Error("Invalid photo key detected");
      }
      entries.push({ type: "url", url: existingKey.trim(), focalX, focalY });
    } else if (pendingKey?.trim()) {
      const thumbPendingKey = formData.get(
        `photo_thumb_pending_key_${i}`,
      ) as string | null;
      const blurhash = formData.get(`photo_blurhash_${i}`) as string | null;
      entries.push({
        type: "pending",
        pendingKey: pendingKey.trim(),
        thumbPendingKey: thumbPendingKey?.trim() || null,
        blurhash: blurhash || null,
        focalX,
        focalY,
      });
    } else {
      const file = formData.get(`photo_file_${i}`);
      if (file && file instanceof File && file.size > 0) {
        entries.push({ type: "file", file, focalX, focalY });
      }
    }
    i++;
  }

  // Process every entry. URLs pass through; pending uploads are committed
  // (via tempFormData → processImageFieldRich's _pending_key branch);
  // legacy File entries go through the sharp pipeline.
  const results = await Promise.all(
    entries.map(async (entry, idx): Promise<ProcessedPhoto | null> => {
      if (entry.type === "url") {
        return {
          key: entry.url,
          thumbKey: null,
          blurhash: null,
          focalX: entry.focalX,
          focalY: entry.focalY,
        };
      }
      if (entry.type === "pending") {
        const tempFormData = new FormData();
        tempFormData.set("photo_pending_key", entry.pendingKey);
        if (entry.thumbPendingKey) {
          tempFormData.set("photo_thumb_pending_key", entry.thumbPendingKey);
        }
        if (entry.blurhash) {
          tempFormData.set("photo_blurhash", entry.blurhash);
        }
        const rich = await processImageFieldRich(
          tempFormData,
          "photo",
          r2Path,
          `photo-${idx}`,
        );
        if (!rich) return null;
        return {
          key: rich.key,
          thumbKey: rich.thumbKey,
          blurhash: rich.blurhash,
          focalX: entry.focalX,
          focalY: entry.focalY,
        };
      }
      // entry.type === "file" — legacy server-side upload path
      const nameWithoutExt = entry.file.name.replace(/\.[^.]+$/, "");
      const uniqueName = `${slugify(nameWithoutExt)}-${idx}`;
      const tempFormData = new FormData();
      tempFormData.set("photo", entry.file);
      const rich = await processImageFieldRich(
        tempFormData,
        "photo",
        r2Path,
        uniqueName,
      );
      if (!rich) return null;
      return {
        key: rich.key,
        thumbKey: rich.thumbKey,
        blurhash: rich.blurhash,
        focalX: entry.focalX,
        focalY: entry.focalY,
      };
    }),
  );

  return results.filter((r): r is ProcessedPhoto => r !== null);
}

// ─── Helper: sync product images (with R2 cleanup) ─────────────────────────

async function syncProductImages(
  productListId: number,
  newPhotos: ProcessedPhoto[],
  uploadedBy: number | null,
) {
  // Get existing images with variants so we can both preserve unchanged
  // photos' thumb+blurhash and clean up R2 objects for removed ones.
  const existing = await d1.query<ProductImage>(
    "SELECT image_id, url, thumb_url, blurhash FROM product_image WHERE product_list_id = ?",
    [productListId],
  );

  const existingByUrl = new Map(
    existing.results.map((img) => [img.url, img] as const),
  );
  const newKeySet = new Set(newPhotos.map((p) => p.key));

  const removedImages = existing.results.filter(
    (img) => !newKeySet.has(img.url),
  );
  const removedKeys = [
    ...removedImages.map((img) => img.url),
    ...removedImages
      .map((img) => img.thumb_url)
      .filter((k): k is string => !!k),
  ];

  // 1. Delete existing DB records
  if (existing.results.length > 0) {
    await Promise.all(
      existing.results.map((img) => productImageService.delete(img.image_id)),
    );
  }

  // 2. Create new image records (DB must be consistent before R2 cleanup)
  if (newPhotos.length > 0) {
    const orderKeys = nKeysBetween(null, null, newPhotos.length);
    await Promise.all(
      newPhotos.map((photo, i) => {
        const prev = existingByUrl.get(photo.key);
        return productImageService.create({
          product_list_id: productListId,
          url: photo.key,
          thumb_url: photo.thumbKey ?? prev?.thumb_url ?? null,
          blurhash: photo.blurhash ?? prev?.blurhash ?? null,
          display_order: orderKeys[i],
          uploaded_by: uploadedBy,
          active: 1,
          // product_image.focal_x / focal_y are NOT NULL — default to 0.5 (center)
          // when the user didn't pick a focal point on this photo.
          focal_x: photo.focalX ?? 0.5,
          focal_y: photo.focalY ?? 0.5,
        });
      }),
    );
  }

  // 3. Clean up removed files from R2 (after DB is consistent)
  await Promise.allSettled(removedKeys.map((key) => deleteFile(key)));
}

// ─── Helper: upload product thumbnail with variants ─────────────────────────

type ThumbnailRecord = {
  thumbnail_url: string | null;
  thumbnail_sm_url: string | null;
  thumbnail_blurhash: string | null;
};

/**
 * Upload the product thumbnail (or keep the existing one) and return the
 * full triplet of fields. `null` for any field means "clear in D1".
 * Pair with `cleanupProductThumbnail` AFTER the D1 update succeeds.
 */
async function uploadProductThumbnail(
  formData: FormData,
  productListId: number,
  existing: Partial<ThumbnailRecord> | null | undefined,
): Promise<ThumbnailRecord> {
  const result = await processImageFieldRich(
    formData,
    "thumbnail_url",
    "products/thumbnails/",
    String(productListId),
    existing?.thumbnail_url
      ? {
          key: existing.thumbnail_url,
          thumbKey: existing.thumbnail_sm_url ?? null,
          blurhash: existing.thumbnail_blurhash ?? null,
        }
      : null,
  );
  if (!result) {
    return {
      thumbnail_url: null,
      thumbnail_sm_url: null,
      thumbnail_blurhash: null,
    };
  }
  return {
    thumbnail_url: result.key,
    thumbnail_sm_url: result.thumbKey,
    thumbnail_blurhash: result.blurhash,
  };
}

/** Clean up both the full-size thumbnail and its sm variant from R2 when changed. */
async function cleanupProductThumbnail(
  oldRecord: Partial<ThumbnailRecord> | null | undefined,
  newRecord: ThumbnailRecord,
) {
  await cleanupOldFile(oldRecord?.thumbnail_url, newRecord.thumbnail_url);
  await cleanupOldFile(oldRecord?.thumbnail_sm_url, newRecord.thumbnail_sm_url);
}

// ─── Helper: extract common product fields from form ────────────────────────

function extractProductFields(formData: FormData) {
  const productType = formData.get("product_type") as string;
  const modelId = Number(formData.get("model_id"));
  const partnerId = Number(formData.get("partner_id"));
  const townshipId = formData.get("township_id")
    ? Number(formData.get("township_id"))
    : null;
  const description = (formData.get("description") as string)?.trim() || null;

  const address = (formData.get("address") as string)?.trim() || null;
  const hideAddress = formData.get("hide_address") === "1" ? 1 : 0;
  const hidePartner = formData.get("hide_partner") === "1" ? 1 : 0;
  const customFields =
    (formData.get("custom_fields") as string)?.trim() || null;

  return {
    partner_id: partnerId,
    equipment_model_id: productType === "equipment" ? modelId : null,
    attachment_model_id: productType === "attachment" ? modelId : null,
    description,
    township_id: townshipId,
    address,
    hide_address: hideAddress,
    hide_partner: hidePartner,
    custom_fields: customFields,
  };
}

const DRAFT_FOR_SALE_KEY = "__draft_for_sale";
const DRAFT_FOR_RENT_KEY = "__draft_for_rent";
const DRAFT_CONDITION_ID_KEY = "__draft_condition_id";
const DRAFT_SALE_USD_PRICE_KEY = "__draft_sale_usd_price";
const DRAFT_SALE_MMK_PRICE_KEY = "__draft_sale_mmk_price";
const DRAFT_RENT_USD_PRICE_KEY = "__draft_rent_usd_price";
const DRAFT_RENT_MMK_PRICE_KEY = "__draft_rent_mmk_price";
const DRAFT_SALE_HIDE_PRICE_KEY = "__draft_sale_hide_price";
const DRAFT_RENT_HIDE_PRICE_KEY = "__draft_rent_hide_price";
const DRAFT_RENTAL_UNIT_KEY = "__draft_rental_unit";
const DRAFT_SALE_DISPLAY_CURRENCY_KEY = "__draft_sale_display_currency";
const DRAFT_RENT_DISPLAY_CURRENCY_KEY = "__draft_rent_display_currency";
const DRAFT_SALE_USE_SYSTEM_RATE_KEY = "__draft_sale_use_system_rate";
const DRAFT_RENT_USE_SYSTEM_RATE_KEY = "__draft_rent_use_system_rate";
const DRAFT_STATE_REGION_ID_KEY = "__draft_state_region_id";
const DRAFT_DISTRICT_ID_KEY = "__draft_district_id";

const ALL_DRAFT_META_KEYS = new Set([
  DRAFT_FOR_SALE_KEY,
  DRAFT_FOR_RENT_KEY,
  DRAFT_CONDITION_ID_KEY,
  DRAFT_SALE_USD_PRICE_KEY,
  DRAFT_SALE_MMK_PRICE_KEY,
  DRAFT_RENT_USD_PRICE_KEY,
  DRAFT_RENT_MMK_PRICE_KEY,
  DRAFT_SALE_HIDE_PRICE_KEY,
  DRAFT_RENT_HIDE_PRICE_KEY,
  DRAFT_RENTAL_UNIT_KEY,
  DRAFT_SALE_DISPLAY_CURRENCY_KEY,
  DRAFT_RENT_DISPLAY_CURRENCY_KEY,
  DRAFT_SALE_USE_SYSTEM_RATE_KEY,
  DRAFT_RENT_USE_SYSTEM_RATE_KEY,
  DRAFT_STATE_REGION_ID_KEY,
  DRAFT_DISTRICT_ID_KEY,
]);

interface DraftMetaField {
  key: string;
  label: string;
  value: string;
}

function buildDraftCustomFields(
  customFieldsRaw: string | null,
  formData: FormData,
): string | null {
  let fields: DraftMetaField[] = [];

  if (customFieldsRaw) {
    try {
      const parsed = JSON.parse(customFieldsRaw);
      if (Array.isArray(parsed)) {
        fields = parsed.filter(
          (f): f is DraftMetaField =>
            !!f &&
            typeof f === "object" &&
            typeof (f as Record<string, unknown>).key === "string" &&
            typeof (f as Record<string, unknown>).label === "string" &&
            typeof (f as Record<string, unknown>).value === "string",
        );
      }
    } catch {
      fields = [];
    }
  }

  // Strip any existing meta entries so we can rewrite cleanly
  const withoutMeta = fields.filter((f) => !ALL_DRAFT_META_KEYS.has(f.key));

  const meta = (key: string, value: string): DraftMetaField => ({
    key,
    label: "__draft_meta",
    value,
  });

  const get = (name: string) => (formData.get(name) as string | null) ?? "";

  withoutMeta.push(
    meta(DRAFT_FOR_SALE_KEY, get("for_sale") === "1" ? "1" : "0"),
    meta(DRAFT_FOR_RENT_KEY, get("for_rent") === "1" ? "1" : "0"),
    meta(DRAFT_CONDITION_ID_KEY, get("condition_type_id")),
    meta(DRAFT_SALE_USD_PRICE_KEY, get("sale_usd_price")),
    meta(DRAFT_SALE_MMK_PRICE_KEY, get("sale_mmk_price")),
    meta(DRAFT_RENT_USD_PRICE_KEY, get("rent_usd_price")),
    meta(DRAFT_RENT_MMK_PRICE_KEY, get("rent_mmk_price")),
    meta(DRAFT_SALE_HIDE_PRICE_KEY, get("sale_hide_price") === "1" ? "1" : "0"),
    meta(DRAFT_RENT_HIDE_PRICE_KEY, get("rent_hide_price") === "1" ? "1" : "0"),
    meta(DRAFT_RENTAL_UNIT_KEY, get("rental_unit")),
    meta(DRAFT_SALE_DISPLAY_CURRENCY_KEY, get("sale_display_currency")),
    meta(DRAFT_RENT_DISPLAY_CURRENCY_KEY, get("rent_display_currency")),
    meta(
      DRAFT_SALE_USE_SYSTEM_RATE_KEY,
      get("sale_use_system_rate") === "1" ? "1" : "0",
    ),
    meta(
      DRAFT_RENT_USE_SYSTEM_RATE_KEY,
      get("rent_use_system_rate") === "1" ? "1" : "0",
    ),
    meta(DRAFT_STATE_REGION_ID_KEY, get("state_region_id")),
    meta(DRAFT_DISTRICT_ID_KEY, get("district_id")),
  );

  return withoutMeta.length > 0 ? JSON.stringify(withoutMeta) : null;
}

// ─── Helper: generate unique alphanumeric listing ID ─────────────────────────

const ID_CHARSET = "0123456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 33 chars (excludes O, I, L)

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

async function generateListingId(
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

// ─── Helper: create product_list and get its ID ─────────────────────────────

function parseThumbnailFocal(formData: FormData) {
  const fx = parseFloat(formData.get("thumbnail_focal_x") as string);
  const fy = parseFloat(formData.get("thumbnail_focal_y") as string);
  return {
    focal_x: isNaN(fx) ? 0.5 : fx,
    focal_y: isNaN(fy) ? 0.5 : fy,
  };
}

async function createProductAndGetId(
  productFields: ReturnType<typeof extractProductFields> & {
    thumbnail_url?: string | null;
  },
  created_by: number | null,
  focalPoint?: { focal_x: number; focal_y: number },
) {
  const product = await productListService.create({
    ...productFields,
    focal_x: focalPoint?.focal_x ?? 0.5,
    focal_y: focalPoint?.focal_y ?? 0.5,
    created_by,
  });
  let productId = (product as unknown as Record<string, unknown>)?.id as number;
  if (!productId) {
    const lastRow = await d1.query<{ id: number }>(
      "SELECT id FROM product_list ORDER BY id DESC LIMIT 1",
    );
    productId = lastRow.results[0]?.id;
  }
  return productId;
}

// ─── Helper: check if current user has approve permission ────────────────────

async function hasApprovePermission(feature: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role_id) return false;
  const permissions = await getCachedPermissionsForRole(session.user.role_id);
  return permissions.includes(`${feature}:approve`);
}

// ─── Helper: get model name from product_list for notifications ──────────────

async function getModelNameForProduct(productListId: number): Promise<string> {
  const result = await d1.query<{ name: string }>(
    `SELECT COALESCE(em.name, am.name, 'Untitled') AS name
     FROM product_list pl
     LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
     LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
     WHERE pl.id = ?`,
    [productListId],
  );
  return result.results[0]?.name ?? "Untitled";
}

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED CREATE (supports sale, rent, or both)
// ═══════════════════════════════════════════════════════════════════════════

export async function createListing(formData: FormData) {
  // Track uploaded R2 keys for cleanup on failure
  const uploadedKeys: string[] = [];

  try {
    const productFields = extractProductFields(formData);
    const forSale = formData.get("for_sale") === "1";
    const forRent = formData.get("for_rent") === "1";
    const productType = formData.get("product_type") as
      | "equipment"
      | "attachment";

    // Publishing options
    const isHidden = formData.get("is_hidden") === "1" ? 1 : 0;
    const saleHidePrice = formData.get("sale_hide_price") === "1" ? 1 : 0;
    const rentHidePrice = formData.get("rent_hide_price") === "1" ? 1 : 0;
    const addToFeatured = formData.get("add_to_featured") === "1";

    if (!forSale && !forRent) {
      return { success: false, error: "Select at least one listing type" };
    }

    // Check permission for whichever listing type(s) are being created
    const created_by = await requirePermission(
      forSale ? "sale_listings" : "rent_listings",
      "create",
    );
    if (forSale && forRent) {
      await requirePermission("rent_listings", "create");
    }

    // Determine approval status: auto-approve if user has approve permission
    const canApproveSale =
      forSale && (await hasApprovePermission("sale_listings"));
    const canApproveRent =
      forRent && (await hasApprovePermission("rent_listings"));

    // 1. Create product_list first (need ID for unique R2 paths)
    const thumbFocal = parseThumbnailFocal(formData);
    const productId = await createProductAndGetId(
      { ...productFields, thumbnail_url: null },
      created_by,
      thumbFocal,
    );

    // 2. Upload thumbnail using product_list_id for unique path
    const thumbResult = await processImageFieldRich(
      formData,
      "thumbnail_url",
      "products/thumbnails/",
      String(productId),
    );
    if (thumbResult?.key) {
      uploadedKeys.push(thumbResult.key);
      if (thumbResult.thumbKey) uploadedKeys.push(thumbResult.thumbKey);
      await productListService.update(productId, {
        thumbnail_url: thumbResult.key,
        thumbnail_sm_url: thumbResult.thumbKey,
        thumbnail_blurhash: thumbResult.blurhash,
        ...thumbFocal,
      });
    }

    // 3. Create sale_listing if selected
    let saleListingId: number | null = null;
    if (forSale) {
      const saleCustomId = await generateListingId("sale", productType);
      // Resolve approval status ID
      const saleStatusName = canApproveSale ? "Approved" : "Pending";
      const statusResult = await d1.query<{ id: number }>(
        "SELECT id FROM approval_status_type WHERE status_name = ?",
        [saleStatusName],
      );
      const saleApproveStatusId = statusResult.results[0]?.id ?? null;

      const saleResult = await saleListingService.create({
        product_list_id: productId,
        custom_id: saleCustomId,
        condition_type_id: formData.get("condition_type_id")
          ? Number(formData.get("condition_type_id"))
          : null,
        mmk_price: formData.get("sale_mmk_price")
          ? Number(formData.get("sale_mmk_price"))
          : null,
        usd_price: formData.get("sale_usd_price")
          ? Number(formData.get("sale_usd_price"))
          : null,
        hide_price: saleHidePrice,
        is_hidden: isHidden,
        is_sold_out: 0,
        display_currency:
          (formData.get("sale_display_currency") as string) || "MMK",
        use_system_rate:
          formData.get("sale_use_system_rate") === "0" ? 0 : 1,
        approve_status_id: saleApproveStatusId,
        approved_by: canApproveSale ? created_by : null,
        approved_at: canApproveSale ? new Date().toISOString() : null,
        created_by,
      });
      saleListingId = (saleResult as unknown as { id: number })?.id ?? null;
      if (!saleListingId) {
        const lastRow = await d1.query<{ id: number }>(
          "SELECT id FROM sale_listing ORDER BY id DESC LIMIT 1",
        );
        saleListingId = lastRow.results[0]?.id ?? null;
      }
    }

    // 4. Create rent_listing if selected
    let rentListingId: number | null = null;
    if (forRent) {
      const rentCustomId = await generateListingId("rent", productType);
      // Resolve approval status ID
      const rentStatusName = canApproveRent ? "Approved" : "Pending";
      const statusResult = await d1.query<{ id: number }>(
        "SELECT id FROM approval_status_type WHERE status_name = ?",
        [rentStatusName],
      );
      const rentApproveStatusId = statusResult.results[0]?.id ?? null;

      const rentResult = await rentListingService.create({
        product_list_id: productId,
        custom_id: rentCustomId,
        mmk_price: formData.get("rent_mmk_price")
          ? Number(formData.get("rent_mmk_price"))
          : null,
        usd_price: formData.get("rent_usd_price")
          ? Number(formData.get("rent_usd_price"))
          : null,
        hide_price: rentHidePrice,
        is_hidden: isHidden,
        is_rented: 0,
        display_currency:
          (formData.get("rent_display_currency") as string) || "MMK",
        use_system_rate:
          formData.get("rent_use_system_rate") === "0" ? 0 : 1,
        rental_unit:
          (formData.get("rental_unit") as RentalUnit) || "per_day",
        approve_status_id: rentApproveStatusId,
        approved_by: canApproveRent ? created_by : null,
        approved_at: canApproveRent ? new Date().toISOString() : null,
        created_by,
      });
      rentListingId = (rentResult as unknown as { id: number })?.id ?? null;
      if (!rentListingId) {
        const lastRow = await d1.query<{ id: number }>(
          "SELECT id FROM rent_listing ORDER BY id DESC LIMIT 1",
        );
        rentListingId = lastRow.results[0]?.id ?? null;
      }
    }

    // 5. Upload and create product photos (using productId for unique R2 path)
    const photos = await processProductPhotos(formData, productId);
    uploadedKeys.push(...photos.map((p) => p.key));
    if (photos.length > 0) {
      await syncProductImages(productId, photos, created_by);
    }

    // 6. Add to featured if requested (only for auto-approved listings)
    if (addToFeatured) {
      const display_order = await getLastDisplayOrder("featured_listing");
      if (forSale && saleListingId && canApproveSale) {
        await featuredListingService.create({
          sale_listing_id: saleListingId,
          rent_listing_id: null,
          display_order,
          created_by,
        });
      } else if (forRent && rentListingId && canApproveRent) {
        await featuredListingService.create({
          sale_listing_id: null,
          rent_listing_id: rentListingId,
          display_order,
          created_by,
        });
      }
    }

    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    if (addToFeatured) invalidateTag(CACHE_TAGS.FEATURED_LISTINGS);

    // 7. Fire-and-forget notifications for non-auto-approved listings
    const modelName = await getModelNameForProduct(productId);
    if (forSale && saleListingId && !canApproveSale) {
      notifyListingSubmitted(
        saleListingId,
        "sale",
        modelName,
        created_by,
      ).catch(() => {});
    }
    if (forRent && rentListingId && !canApproveRent) {
      notifyListingSubmitted(
        rentListingId,
        "rent",
        modelName,
        created_by,
      ).catch(() => {});
    }

    auditLog(created_by, "created listing | product=" + productId + " | type=" + (forSale && forRent ? "sale+rent" : forSale ? "sale" : "rent"));
    return { success: true };
  } catch (error) {
    // Clean up any R2 files that were uploaded before the failure
    await Promise.allSettled(uploadedKeys.map((key) => deleteFile(key)));
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create listing"),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SALE LISTING CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function updateSaleListing(saleId: number, formData: FormData) {
  try {
    const userId = await requirePermission("sale_listings", "edit");
    // Get existing sale listing to find product_list_id and thumbnail
    const existing = await d1.query<{
      product_list_id: number;
      thumbnail_url: string | null;
      thumbnail_sm_url: string | null;
      thumbnail_blurhash: string | null;
    }>(
      "SELECT sl.product_list_id, pl.thumbnail_url, pl.thumbnail_sm_url, pl.thumbnail_blurhash FROM sale_listing sl JOIN product_list pl ON sl.product_list_id = pl.id WHERE sl.id = ?",
      [saleId],
    );
    const existingRow = existing.results[0];
    const productListId = existingRow?.product_list_id;
    if (!productListId) {
      return { success: false, error: "Sale listing not found" };
    }

    const productFields = extractProductFields(formData);
    const thumbFocal = parseThumbnailFocal(formData);

    // 1. Handle thumbnail upload (using productListId for unique R2 path)
    const thumbnailFields = await uploadProductThumbnail(
      formData,
      productListId,
      existingRow,
    );

    // 2. Update product_list
    await productListService.update(productListId, {
      ...productFields,
      ...thumbnailFields,
      ...thumbFocal,
    });

    // 3. Update sale_listing
    await saleListingService.update(saleId, {
      condition_type_id: formData.get("condition_type_id")
        ? Number(formData.get("condition_type_id"))
        : null,
      mmk_price: formData.get("sale_mmk_price")
        ? Number(formData.get("sale_mmk_price"))
        : null,
      usd_price: formData.get("sale_usd_price")
        ? Number(formData.get("sale_usd_price"))
        : null,
      hide_price: formData.get("sale_hide_price") === "1" ? 1 : 0,
      is_hidden: formData.get("is_hidden") === "1" ? 1 : 0,
      display_currency:
        (formData.get("sale_display_currency") as string) || "MMK",
      use_system_rate:
        formData.get("sale_use_system_rate") === "0" ? 0 : 1,
    });

    // 4. Sync product photos
    const photos = await processProductPhotos(formData, productListId);
    await syncProductImages(productListId, photos, null);

    // 5. Clean up old thumbnail from R2 (after D1 is consistent)
    await cleanupProductThumbnail(existingRow, thumbnailFields);

    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    auditLog(userId, "updated sale listing | id=" + saleId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update sale listing"),
    };
  }
}

export async function deleteSaleListing(saleId: number) {
  try {
    const deletedBy = await requirePermission("sale_listings", "delete");
    // Get product_list_id for cascading soft delete (only if not already deleted)
    const existing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM sale_listing WHERE id = ? AND deleted_at IS NULL",
      [saleId],
    );
    if (existing.results.length === 0) {
      return { success: false, error: "Listing not found or already deleted" };
    }
    const productListId = existing.results[0]?.product_list_id;

    // Soft delete the sale listing
    await saleListingService.softDelete(saleId, deletedBy);

    const batchId = crypto.randomUUID();
    await saveTrashMetadata("sale_listing", saleId, deletedBy, { batchId });

    // Soft delete product_list if no other listing references it
    if (productListId) {
      const siblings = await d1.query<{ cnt: number }>(
        "SELECT (SELECT COUNT(*) FROM sale_listing WHERE product_list_id = ? AND deleted_at IS NULL) + (SELECT COUNT(*) FROM rent_listing WHERE product_list_id = ? AND deleted_at IS NULL) AS cnt",
        [productListId, productListId],
      );
      const remaining = siblings.results[0]?.cnt ?? 0;

      if (remaining === 0) {
        await productListService.softDelete(productListId, deletedBy);
        await saveTrashMetadata("product_list", productListId, deletedBy, {
          batchId,
        });
      }
    }

    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    auditLog(deletedBy, "deleted sale listing | id=" + saleId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete sale listing"),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENT LISTING CRUD
// ═══════════════════════════════════════════════════════════════════════════

export async function updateRentListing(rentId: number, formData: FormData) {
  try {
    const userId = await requirePermission("rent_listings", "edit");
    // Get existing rent listing to find product_list_id and thumbnail
    const existing = await d1.query<{
      product_list_id: number;
      thumbnail_url: string | null;
      thumbnail_sm_url: string | null;
      thumbnail_blurhash: string | null;
    }>(
      "SELECT rl.product_list_id, pl.thumbnail_url, pl.thumbnail_sm_url, pl.thumbnail_blurhash FROM rent_listing rl JOIN product_list pl ON rl.product_list_id = pl.id WHERE rl.id = ?",
      [rentId],
    );
    const existingRow = existing.results[0];
    const productListId = existingRow?.product_list_id;
    if (!productListId) {
      return { success: false, error: "Rent listing not found" };
    }

    const productFields = extractProductFields(formData);
    const thumbFocal = parseThumbnailFocal(formData);

    // 1. Handle thumbnail upload (using productListId for unique R2 path)
    const thumbnailFields = await uploadProductThumbnail(
      formData,
      productListId,
      existingRow,
    );

    // 2. Update product_list
    await productListService.update(productListId, {
      ...productFields,
      ...thumbnailFields,
      ...thumbFocal,
    });

    // 3. Update rent_listing
    await rentListingService.update(rentId, {
      mmk_price: formData.get("rent_mmk_price")
        ? Number(formData.get("rent_mmk_price"))
        : null,
      usd_price: formData.get("rent_usd_price")
        ? Number(formData.get("rent_usd_price"))
        : null,
      hide_price: formData.get("rent_hide_price") === "1" ? 1 : 0,
      is_hidden: formData.get("is_hidden") === "1" ? 1 : 0,
      display_currency:
        (formData.get("rent_display_currency") as string) || "MMK",
      use_system_rate:
        formData.get("rent_use_system_rate") === "0" ? 0 : 1,
      rental_unit:
        (formData.get("rental_unit") as RentalUnit) || "per_day",
    });

    // 4. Sync product photos
    const photos = await processProductPhotos(formData, productListId);
    await syncProductImages(productListId, photos, null);

    // 5. Clean up old thumbnail from R2 (after D1 is consistent)
    await cleanupProductThumbnail(existingRow, thumbnailFields);

    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    auditLog(userId, "updated rent listing | id=" + rentId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update rent listing"),
    };
  }
}

export async function deleteRentListing(rentId: number) {
  try {
    const deletedBy = await requirePermission("rent_listings", "delete");
    // Get product_list_id for cascading soft delete (only if not already deleted)
    const existing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM rent_listing WHERE id = ? AND deleted_at IS NULL",
      [rentId],
    );
    if (existing.results.length === 0) {
      return { success: false, error: "Listing not found or already deleted" };
    }
    const productListId = existing.results[0]?.product_list_id;

    // Soft delete the rent listing
    await rentListingService.softDelete(rentId, deletedBy);

    const batchId = crypto.randomUUID();
    await saveTrashMetadata("rent_listing", rentId, deletedBy, { batchId });

    // Soft delete product_list if no other listing references it
    if (productListId) {
      const siblings = await d1.query<{ cnt: number }>(
        "SELECT (SELECT COUNT(*) FROM sale_listing WHERE product_list_id = ? AND deleted_at IS NULL) + (SELECT COUNT(*) FROM rent_listing WHERE product_list_id = ? AND deleted_at IS NULL) AS cnt",
        [productListId, productListId],
      );
      const remaining = siblings.results[0]?.cnt ?? 0;

      if (remaining === 0) {
        await productListService.softDelete(productListId, deletedBy);
        await saveTrashMetadata("product_list", productListId, deletedBy, {
          batchId,
        });
      }
    }

    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    auditLog(deletedBy, "deleted rent listing | id=" + rentId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete rent listing"),
    };
  }
}

async function deleteListings(
  type: "sale" | "rent",
  ids: number[],
) {
  const feature = type === "sale" ? "sale_listings" : "rent_listings";
  const table = type === "sale" ? "sale_listing" : "rent_listing";
  const service = type === "sale" ? saleListingService : rentListingService;
  const cacheTag = type === "sale" ? CACHE_TAGS.SALE_LISTINGS : CACHE_TAGS.RENT_LISTINGS;

  const deletedBy = await requirePermission(feature, "delete");
  assertBulkLimit(ids);

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const existing = await d1.query<{ product_list_id: number }>(
        `SELECT product_list_id FROM ${table} WHERE id = ? AND deleted_at IS NULL`,
        [id],
      );
      if (existing.results.length === 0) return;
      const productListId = existing.results[0]?.product_list_id;

      await service.softDelete(id, deletedBy);
      const batchId = crypto.randomUUID();
      await saveTrashMetadata(table, id, deletedBy, { batchId });

      // Cascade: delete orphaned product_list if no other listings reference it
      if (productListId) {
        const siblings = await d1.query<{ cnt: number }>(
          "SELECT (SELECT COUNT(*) FROM sale_listing WHERE product_list_id = ? AND deleted_at IS NULL) + (SELECT COUNT(*) FROM rent_listing WHERE product_list_id = ? AND deleted_at IS NULL) AS cnt",
          [productListId, productListId],
        );
        if ((siblings.results[0]?.cnt ?? 0) === 0) {
          await productListService.softDelete(productListId, deletedBy);
          await saveTrashMetadata("product_list", productListId, deletedBy, { batchId });
        }
      }
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) => getErrorMessage(r.reason, `Failed to delete listing ${ids[i]}`));
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(cacheTag);
  auditLog(deletedBy, "bulk deleted " + type + " listings | count=" + deleted);

  if (errors.length > 0) {
    return { success: false, error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}` };
  }
  return { success: true };
}

export async function deleteSaleListings(ids: number[]) {
  return deleteListings("sale", ids);
}

export async function deleteRentListings(ids: number[]) {
  return deleteListings("rent", ids);
}

// ═══════════════════════════════════════════════════════════════════════════
// TOGGLE ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function toggleSaleHidden(id: number) {
  try {
    const userId = await requirePermission("sale_listings", "edit");
    const current = await d1.query<{ is_hidden: number }>(
      "SELECT is_hidden FROM sale_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.is_hidden === 1 ? 0 : 1;
    await saleListingService.update(id, { is_hidden: newVal });
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    auditLog(userId, "toggled sale listing hidden | id=" + id);
    return { success: true, is_hidden: newVal };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle visibility"),
    };
  }
}

export async function toggleRentHidden(id: number) {
  try {
    const userId = await requirePermission("rent_listings", "edit");
    const current = await d1.query<{ is_hidden: number }>(
      "SELECT is_hidden FROM rent_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.is_hidden === 1 ? 0 : 1;
    await rentListingService.update(id, { is_hidden: newVal });
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    auditLog(userId, "toggled rent listing hidden | id=" + id);
    return { success: true, is_hidden: newVal };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle visibility"),
    };
  }
}

export async function toggleSoldOut(id: number) {
  try {
    const userId = await requirePermission("sale_listings", "edit");
    const current = await d1.query<{ is_sold_out: number }>(
      "SELECT is_sold_out FROM sale_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.is_sold_out === 1 ? 0 : 1;
    await saleListingService.update(id, { is_sold_out: newVal });
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    auditLog(userId, "toggled sale listing sold out | id=" + id);
    return { success: true, is_sold_out: newVal };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle sold out"),
    };
  }
}

export async function toggleSaleHidePrice(id: number) {
  try {
    const userId = await requirePermission("sale_listings", "edit");
    const current = await d1.query<{ hide_price: number }>(
      "SELECT hide_price FROM sale_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.hide_price === 1 ? 0 : 1;
    await saleListingService.update(id, { hide_price: newVal });
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    auditLog(userId, "toggled sale listing hide price | id=" + id);
    return { success: true, hide_price: newVal };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle price visibility"),
    };
  }
}

export async function toggleIsRented(id: number) {
  try {
    const userId = await requirePermission("rent_listings", "edit");
    const current = await d1.query<{ is_rented: number }>(
      "SELECT is_rented FROM rent_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.is_rented === 1 ? 0 : 1;
    await rentListingService.update(id, { is_rented: newVal });
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    auditLog(userId, "toggled rent listing rented | id=" + id);
    return { success: true, is_rented: newVal };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle rented status"),
    };
  }
}

export async function toggleRentHidePrice(id: number) {
  try {
    const userId = await requirePermission("rent_listings", "edit");
    const current = await d1.query<{ hide_price: number }>(
      "SELECT hide_price FROM rent_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.hide_price === 1 ? 0 : 1;
    await rentListingService.update(id, { hide_price: newVal });
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    auditLog(userId, "toggled rent listing hide price | id=" + id);
    return { success: true, hide_price: newVal };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle price visibility"),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURED LISTING ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function addToFeatured(type: "sale" | "rent", listingId: number) {
  try {
    const [created_by, display_order] = await Promise.all([
      requirePermission("featured_listings", "create"),
      getLastDisplayOrder("featured_listing"),
    ]);

    await featuredListingService.create({
      sale_listing_id: type === "sale" ? listingId : null,
      rent_listing_id: type === "rent" ? listingId : null,
      display_order,
      created_by,
    });

    invalidateTag(CACHE_TAGS.FEATURED_LISTINGS);
    auditLog(created_by, "added to featured | type=" + type + " | listing=" + listingId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to feature listing"),
    };
  }
}

export async function removeFromFeatured(featuredId: number) {
  try {
    const userId = await requirePermission("featured_listings", "delete");
    await featuredListingService.delete(featuredId);
    invalidateTag(CACHE_TAGS.FEATURED_LISTINGS);
    auditLog(userId, "removed from featured | id=" + featuredId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove from featured"),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY ACTIONS (JOIN)
// ═══════════════════════════════════════════════════════════════════════════

export async function getSaleListingsWithDetails(): Promise<
  SaleListingWithDetails[]
> {
  const result = await d1.query<SaleListingWithDetails>(
    `SELECT
      sl.id, sl.custom_id, sl.product_list_id, sl.condition_type_id,
      ct.name AS condition_name,
      sl.mmk_price, sl.usd_price, sl.hide_price, sl.is_hidden, sl.is_sold_out, sl.display_currency, sl.use_system_rate, pl.hide_partner, pl.address, pl.hide_address,
      sl.approve_status_id, sl.rejection_reason, sl.approved_at,
      sl.created_at, sl.display_order,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      c.email AS partner_email, c.phone AS partner_phone,
      c.company_name AS partner_company, c.address AS partner_address,
      c.is_verified AS partner_verified, c.created_at AS partner_joined,
      bt.name AS partner_business_type, pt.name AS partner_type_name,
      pst.status_name AS partner_status, p.applied_at AS partner_applied_at,
      p.reviewed_at AS partner_reviewed_at, p.app_user_id AS partner_app_user_id,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id
    FROM sale_listing sl
    JOIN product_list pl ON sl.product_list_id = pl.id
    LEFT JOIN condition_type ct ON sl.condition_type_id = ct.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN business_type bt ON c.business_type_id = bt.business_type_id
    LEFT JOIN partner_type pt ON p.partner_type_id = pt.id
    LEFT JOIN partner_status_type pst ON p.status_id = pst.id
    LEFT JOIN township t ON pl.township_id = t.township_id
    LEFT JOIN approval_status_type ast ON sl.approve_status_id = ast.id
    LEFT JOIN featured_listing fl ON fl.sale_listing_id = sl.id
    WHERE sl.deleted_at IS NULL AND pl.deleted_at IS NULL
    ORDER BY sl.display_order ASC, sl.created_at DESC`,
  );
  return result.results;
}

export async function getRentListingsWithDetails(): Promise<
  RentListingWithDetails[]
> {
  const result = await d1.query<RentListingWithDetails>(
    `SELECT
      rl.id, rl.custom_id, rl.product_list_id,
      rl.mmk_price, rl.usd_price, rl.hide_price, rl.is_hidden, rl.is_rented, rl.display_currency, rl.use_system_rate, rl.rental_unit, pl.hide_partner, pl.address, pl.hide_address,
      rl.approve_status_id, rl.rejection_reason, rl.approved_at,
      rl.created_at, rl.display_order,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      c.email AS partner_email, c.phone AS partner_phone,
      c.company_name AS partner_company, c.address AS partner_address,
      c.is_verified AS partner_verified, c.created_at AS partner_joined,
      bt.name AS partner_business_type, pt.name AS partner_type_name,
      pst.status_name AS partner_status, p.applied_at AS partner_applied_at,
      p.reviewed_at AS partner_reviewed_at, p.app_user_id AS partner_app_user_id,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id
    FROM rent_listing rl
    JOIN product_list pl ON rl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN business_type bt ON c.business_type_id = bt.business_type_id
    LEFT JOIN partner_type pt ON p.partner_type_id = pt.id
    LEFT JOIN partner_status_type pst ON p.status_id = pst.id
    LEFT JOIN township t ON pl.township_id = t.township_id
    LEFT JOIN approval_status_type ast ON rl.approve_status_id = ast.id
    LEFT JOIN featured_listing fl ON fl.rent_listing_id = rl.id
    LEFT JOIN sale_listing sl ON sl.product_list_id = pl.id AND sl.deleted_at IS NULL
    WHERE rl.deleted_at IS NULL AND pl.deleted_at IS NULL
      AND (sl.is_sold_out IS NULL OR sl.is_sold_out = 0)
    ORDER BY rl.display_order ASC, rl.created_at DESC`,
  );
  return result.results;
}

export async function getFeaturedListingsWithDetails(): Promise<
  FeaturedListingWithDetails[]
> {
  const result = await d1.query<FeaturedListingRow>(
    `SELECT
      fl.id, fl.sale_listing_id, fl.rent_listing_id, fl.display_order,
      CASE WHEN fl.sale_listing_id IS NOT NULL THEN 'sale' ELSE 'rent' END AS listing_type,
      COALESCE(pl_s.id, pl_r.id) AS product_list_id,
      COALESCE(sl.custom_id, rl.custom_id) AS custom_id,
      CASE WHEN COALESCE(pl_s.equipment_model_id, pl_r.equipment_model_id) IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      COALESCE(em_s.name, am_s.name, em_r.name, am_r.name) AS model_name,
      COALESCE(c_s.username, c_r.username) AS partner_name,
      COALESCE(pl_s.thumbnail_url, pl_r.thumbnail_url) AS thumbnail_url,
      COALESCE(sl.approved_at, rl.approved_at) AS approved_at
    FROM featured_listing fl
    LEFT JOIN sale_listing sl ON fl.sale_listing_id = sl.id AND sl.deleted_at IS NULL
    LEFT JOIN product_list pl_s ON sl.product_list_id = pl_s.id AND pl_s.deleted_at IS NULL
    LEFT JOIN equipment_model em_s ON pl_s.equipment_model_id = em_s.model_id AND em_s.deleted_at IS NULL
    LEFT JOIN attachment_model am_s ON pl_s.attachment_model_id = am_s.model_id AND am_s.deleted_at IS NULL
    LEFT JOIN partner p_s ON pl_s.partner_id = p_s.id AND p_s.deleted_at IS NULL
    LEFT JOIN app_user c_s ON p_s.app_user_id = c_s.app_user_id AND c_s.deleted_at IS NULL
    LEFT JOIN rent_listing rl ON fl.rent_listing_id = rl.id AND rl.deleted_at IS NULL
    LEFT JOIN product_list pl_r ON rl.product_list_id = pl_r.id AND pl_r.deleted_at IS NULL
    LEFT JOIN equipment_model em_r ON pl_r.equipment_model_id = em_r.model_id AND em_r.deleted_at IS NULL
    LEFT JOIN attachment_model am_r ON pl_r.attachment_model_id = am_r.model_id AND am_r.deleted_at IS NULL
    LEFT JOIN partner p_r ON pl_r.partner_id = p_r.id AND p_r.deleted_at IS NULL
    LEFT JOIN app_user c_r ON p_r.app_user_id = c_r.app_user_id AND c_r.deleted_at IS NULL
    ORDER BY fl.display_order ASC`,
  );

  // Merge rows that share the same product_list_id into a single row
  const mergedMap = new Map<number, FeaturedListingWithDetails>();
  for (const row of result.results) {
    const existing = mergedMap.get(row.product_list_id);
    if (existing) {
      // Merge listing types and featured ids
      if (!existing.listing_types.includes(row.listing_type)) {
        existing.listing_types.push(row.listing_type);
      }
      existing.featured_ids.push(row.id);
      // Keep the sale_listing_id and rent_listing_id from both rows
      if (row.sale_listing_id) existing.sale_listing_id = row.sale_listing_id;
      if (row.rent_listing_id) existing.rent_listing_id = row.rent_listing_id;
    } else {
      mergedMap.set(row.product_list_id, {
        id: row.id,
        featured_ids: [row.id],
        sale_listing_id: row.sale_listing_id,
        rent_listing_id: row.rent_listing_id,
        display_order: row.display_order,
        listing_types: [row.listing_type],
        product_list_id: row.product_list_id,
        custom_id: row.custom_id,
        model_name: row.model_name,
        product_type: row.product_type,
        partner_name: row.partner_name,
        thumbnail_url: row.thumbnail_url,
        approved_at: row.approved_at,
      });
    }
  }

  return Array.from(mergedMap.values());
}

// ─── Get product images for a product ───────────────────────────────────────

export async function getProductImages(
  productListId: number,
): Promise<ProductImage[]> {
  const result = await d1.query<ProductImage>(
    "SELECT * FROM product_image WHERE product_list_id = ? ORDER BY display_order ASC",
    [productListId],
  );
  return result.results;
}

// ─── Get approved partners for form dropdown ────────────────────────────────

export async function getApprovedPartners(): Promise<
  { id: number; user_name: string; company_name: string | null }[]
> {
  const result = await d1.query<{
    id: number;
    user_name: string;
    company_name: string | null;
  }>(
    `SELECT p.id, c.username AS user_name, c.company_name
    FROM partner p
    JOIN app_user c ON p.app_user_id = c.app_user_id
    JOIN partner_status_type pst ON p.status_id = pst.id
    WHERE pst.status_name = 'Approved'
      AND p.deleted_at IS NULL
      AND c.deleted_at IS NULL
    ORDER BY c.username ASC`,
  );
  return result.results;
}

// ─── Get single listing by ID (for edit page) ────────────────────────────────

export async function getSaleListingWithDetailsById(
  id: number,
): Promise<SaleListingWithDetails | null> {
  const result = await d1.query<SaleListingWithDetails>(
    `SELECT
      sl.id, sl.custom_id, sl.product_list_id, sl.condition_type_id,
      ct.name AS condition_name,
      sl.mmk_price, sl.usd_price, sl.hide_price, sl.is_hidden, sl.is_sold_out, sl.display_currency, sl.use_system_rate, pl.hide_partner, pl.address, pl.hide_address,
      sl.approve_status_id, sl.rejection_reason, sl.approved_at, sl.approved_by,
      sl.created_at,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id,
      approver.username AS approved_by_name
    FROM sale_listing sl
    JOIN product_list pl ON sl.product_list_id = pl.id
    LEFT JOIN condition_type ct ON sl.condition_type_id = ct.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN township t ON pl.township_id = t.township_id
    LEFT JOIN approval_status_type ast ON sl.approve_status_id = ast.id
    LEFT JOIN featured_listing fl ON fl.sale_listing_id = sl.id
    LEFT JOIN admin_user approver ON sl.approved_by = approver.user_id
    WHERE sl.id = ? AND sl.deleted_at IS NULL`,
    [id],
  );
  return result.results[0] ?? null;
}

export async function getRentListingWithDetailsById(
  id: number,
): Promise<RentListingWithDetails | null> {
  const result = await d1.query<RentListingWithDetails>(
    `SELECT
      rl.id, rl.custom_id, rl.product_list_id,
      rl.mmk_price, rl.usd_price, rl.hide_price, rl.is_hidden, rl.is_rented, rl.display_currency, rl.use_system_rate, rl.rental_unit, pl.hide_partner, pl.address, pl.hide_address,
      rl.approve_status_id, rl.rejection_reason, rl.approved_at, rl.approved_by,
      rl.created_at,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id,
      approver.username AS approved_by_name
    FROM rent_listing rl
    JOIN product_list pl ON rl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN township t ON pl.township_id = t.township_id
    LEFT JOIN approval_status_type ast ON rl.approve_status_id = ast.id
    LEFT JOIN featured_listing fl ON fl.rent_listing_id = rl.id
    LEFT JOIN admin_user approver ON rl.approved_by = approver.user_id
    WHERE rl.id = ? AND rl.deleted_at IS NULL`,
    [id],
  );
  return result.results[0] ?? null;
}

// ─── Unified listing detail (for detail page) ──────────────────────────────

export async function getListingDetail(
  productListId: number,
): Promise<ListingDetail | null> {
  // Try sale first, then rent
  const sale = await d1.query<ListingDetail>(
    `SELECT
      'sale' AS listing_type,
      sl.id, sl.custom_id, sl.product_list_id,
      sl.condition_type_id, ct.name AS condition_name,
      sl.is_sold_out, NULL AS is_rented, NULL AS rental_unit,
      sl.mmk_price, sl.usd_price, sl.hide_price, sl.display_currency, sl.use_system_rate, sl.is_hidden,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.hide_partner, pl.address, pl.hide_address, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      COALESCE(eb.name, ab.name) AS brand_name,
      COALESCE(em.pdf_url, am.pdf_url) AS pdf_url,
      emc.name AS main_category_name,
      esc.name AS sub_category_name,
      ac.name AS attachment_category_name,
      t.name AS township_name,
      d.name AS district_name,
      sr.name AS state_region_name,
      c.username AS partner_name, c.email AS partner_email, c.phone AS partner_phone,
      c.company_name AS partner_company, c.address AS partner_address,
      c.is_verified AS partner_verified, c.created_at AS partner_joined,
      bt.name AS partner_business_type, pt.name AS partner_type_name,
      pst.status_name AS partner_status,
      sl.approve_status_id, ast.status_name AS approve_status_name,
      sl.rejection_reason, sl.approved_at,
      approved_admin.username AS approved_by_name,
      created_admin.username AS created_by_name,
      fl.id AS featured_id,
      (SELECT rl2.id FROM rent_listing rl2 WHERE rl2.product_list_id = pl.id AND rl2.deleted_at IS NULL LIMIT 1) AS other_listing_id,
      (SELECT CASE WHEN rl2.id IS NOT NULL THEN 'rent' END FROM rent_listing rl2 WHERE rl2.product_list_id = pl.id AND rl2.deleted_at IS NULL LIMIT 1) AS other_listing_type,
      sl.created_at, sl.updated_at
    FROM sale_listing sl
    JOIN product_list pl ON sl.product_list_id = pl.id
    LEFT JOIN condition_type ct ON sl.condition_type_id = ct.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN product_brand eb ON em.brand_id = eb.brand_id
    LEFT JOIN product_brand ab ON am.brand_id = ab.brand_id
    LEFT JOIN equipment_sub_category esc ON em.sub_category_id = esc.sub_category_id
    LEFT JOIN equipment_main_category emc ON esc.category_id = emc.category_id
    LEFT JOIN attachment_category ac ON am.category_id = ac.category_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN business_type bt ON c.business_type_id = bt.business_type_id
    LEFT JOIN partner_type pt ON p.partner_type_id = pt.id
    LEFT JOIN partner_status_type pst ON p.status_id = pst.id
    LEFT JOIN township t ON pl.township_id = t.township_id
    LEFT JOIN district d ON t.district_id = d.district_id
    LEFT JOIN state_region sr ON d.state_region_id = sr.state_region_id
    LEFT JOIN approval_status_type ast ON sl.approve_status_id = ast.id
    LEFT JOIN admin_user approved_admin ON sl.approved_by = approved_admin.user_id
    LEFT JOIN admin_user created_admin ON sl.created_by = created_admin.user_id
    LEFT JOIN featured_listing fl ON fl.sale_listing_id = sl.id
    WHERE sl.product_list_id = ? AND sl.deleted_at IS NULL`,
    [productListId],
  );
  if (sale.results[0]) return sale.results[0];

  const rent = await d1.query<ListingDetail>(
    `SELECT
      'rent' AS listing_type,
      rl.id, rl.custom_id, rl.product_list_id,
      NULL AS condition_type_id, NULL AS condition_name,
      NULL AS is_sold_out, rl.is_rented, rl.rental_unit,
      rl.mmk_price, rl.usd_price, rl.hide_price, rl.display_currency, rl.use_system_rate, rl.is_hidden,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.hide_partner, pl.address, pl.hide_address, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      COALESCE(eb.name, ab.name) AS brand_name,
      COALESCE(em.pdf_url, am.pdf_url) AS pdf_url,
      emc.name AS main_category_name,
      esc.name AS sub_category_name,
      ac.name AS attachment_category_name,
      t.name AS township_name,
      d.name AS district_name,
      sr.name AS state_region_name,
      c.username AS partner_name, c.email AS partner_email, c.phone AS partner_phone,
      c.company_name AS partner_company, c.address AS partner_address,
      c.is_verified AS partner_verified, c.created_at AS partner_joined,
      bt.name AS partner_business_type, pt.name AS partner_type_name,
      pst.status_name AS partner_status,
      rl.approve_status_id, ast.status_name AS approve_status_name,
      rl.rejection_reason, rl.approved_at,
      approved_admin.username AS approved_by_name,
      created_admin.username AS created_by_name,
      fl.id AS featured_id,
      (SELECT sl2.id FROM sale_listing sl2 WHERE sl2.product_list_id = pl.id AND sl2.deleted_at IS NULL LIMIT 1) AS other_listing_id,
      (SELECT CASE WHEN sl2.id IS NOT NULL THEN 'sale' END FROM sale_listing sl2 WHERE sl2.product_list_id = pl.id AND sl2.deleted_at IS NULL LIMIT 1) AS other_listing_type,
      rl.created_at, rl.updated_at
    FROM rent_listing rl
    JOIN product_list pl ON rl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN product_brand eb ON em.brand_id = eb.brand_id
    LEFT JOIN product_brand ab ON am.brand_id = ab.brand_id
    LEFT JOIN equipment_sub_category esc ON em.sub_category_id = esc.sub_category_id
    LEFT JOIN equipment_main_category emc ON esc.category_id = emc.category_id
    LEFT JOIN attachment_category ac ON am.category_id = ac.category_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN business_type bt ON c.business_type_id = bt.business_type_id
    LEFT JOIN partner_type pt ON p.partner_type_id = pt.id
    LEFT JOIN partner_status_type pst ON p.status_id = pst.id
    LEFT JOIN township t ON pl.township_id = t.township_id
    LEFT JOIN district d ON t.district_id = d.district_id
    LEFT JOIN state_region sr ON d.state_region_id = sr.state_region_id
    LEFT JOIN approval_status_type ast ON rl.approve_status_id = ast.id
    LEFT JOIN admin_user approved_admin ON rl.approved_by = approved_admin.user_id
    LEFT JOIN admin_user created_admin ON rl.created_by = created_admin.user_id
    LEFT JOIN featured_listing fl ON fl.rent_listing_id = rl.id
    WHERE rl.product_list_id = ? AND rl.deleted_at IS NULL`,
    [productListId],
  );
  return rent.results[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTING APPROVAL ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function approveListingSale(id: number) {
  try {
    const userId = await requirePermission("sale_listings", "approve");
    await d1.query(
      `UPDATE sale_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Approved'), approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId, id],
    );
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    auditLog(userId, "approved sale listing | id=" + id);

    // Notify the creator (fire-and-forget)
    const listing = await d1.query<{
      product_list_id: number;
      created_by: number | null;
    }>("SELECT product_list_id, created_by FROM sale_listing WHERE id = ?", [
      id,
    ]);
    const row = listing.results[0];
    if (row?.created_by) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingApproved(
        id,
        "sale",
        modelName,
        row.created_by,
        userId,
      ).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to approve listing"),
    };
  }
}

export async function requestReworkSale(id: number, reason?: string) {
  try {
    const userId = await requirePermission("sale_listings", "approve");
    await d1.query(
      `UPDATE sale_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Rework'), rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [reason || null, id],
    );
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    auditLog(userId, "requested rework for sale listing | id=" + id);

    // Notify the creator (fire-and-forget)
    const listing = await d1.query<{
      product_list_id: number;
      created_by: number | null;
    }>("SELECT product_list_id, created_by FROM sale_listing WHERE id = ?", [
      id,
    ]);
    const row = listing.results[0];
    if (row?.created_by) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingRework(
        id,
        "sale",
        modelName,
        row.created_by,
        userId,
        reason,
      ).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to request rework"),
    };
  }
}

export async function approveListingRent(id: number) {
  try {
    const userId = await requirePermission("rent_listings", "approve");
    await d1.query(
      `UPDATE rent_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Approved'), approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId, id],
    );
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    auditLog(userId, "approved rent listing | id=" + id);

    // Notify the creator (fire-and-forget)
    const listing = await d1.query<{
      product_list_id: number;
      created_by: number | null;
    }>("SELECT product_list_id, created_by FROM rent_listing WHERE id = ?", [
      id,
    ]);
    const row = listing.results[0];
    if (row?.created_by) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingApproved(
        id,
        "rent",
        modelName,
        row.created_by,
        userId,
      ).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to approve listing"),
    };
  }
}

export async function requestReworkRent(id: number, reason?: string) {
  try {
    const userId = await requirePermission("rent_listings", "approve");
    await d1.query(
      `UPDATE rent_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Rework'), rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [reason || null, id],
    );
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    auditLog(userId, "requested rework for rent listing | id=" + id);

    // Notify the creator (fire-and-forget)
    const listing = await d1.query<{
      product_list_id: number;
      created_by: number | null;
    }>("SELECT product_list_id, created_by FROM rent_listing WHERE id = ?", [
      id,
    ]);
    const row = listing.results[0];
    if (row?.created_by) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingRework(
        id,
        "rent",
        modelName,
        row.created_by,
        userId,
        reason,
      ).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to request rework"),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESUBMIT (Rework → Pending)
// ═══════════════════════════════════════════════════════════════════════════

export async function resubmitSaleListing(id: number) {
  try {
    const userId = await requirePermission("sale_listings", "edit");
    await d1.query(
      `UPDATE sale_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Pending'), rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id],
    );
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    auditLog(userId, "resubmitted sale listing | id=" + id);

    // Notify approvers (fire-and-forget)
    const listing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM sale_listing WHERE id = ?",
      [id],
    );
    const row = listing.results[0];
    if (row) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingSubmitted(id, "sale", modelName, userId).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to resubmit listing"),
    };
  }
}

export async function resubmitRentListing(id: number) {
  try {
    const userId = await requirePermission("rent_listings", "edit");
    await d1.query(
      `UPDATE rent_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Pending'), rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id],
    );
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    auditLog(userId, "resubmitted rent listing | id=" + id);

    // Notify approvers (fire-and-forget)
    const listing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM rent_listing WHERE id = ?",
      [id],
    );
    const row = listing.results[0];
    if (row) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingSubmitted(id, "rent", modelName, userId).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to resubmit listing"),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAFT ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Save a new draft (product_list with is_draft=1). All fields optional. */
export async function saveDraft(formData: FormData) {
  const uploadedKeys: string[] = [];
  try {
    const userId = await requireAuth();

    // Extract whatever fields are filled (all optional for drafts)
    const productType = formData.get("product_type") as string | null;
    const modelId = formData.get("model_id")
      ? Number(formData.get("model_id"))
      : null;
    const partnerId = formData.get("partner_id")
      ? Number(formData.get("partner_id"))
      : null;
    const townshipId = formData.get("township_id")
      ? Number(formData.get("township_id"))
      : null;
    const description = (formData.get("description") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;
    const hideAddress = formData.get("hide_address") === "1" ? 1 : 0;
    const hidePartner = formData.get("hide_partner") === "1" ? 1 : 0;
    const customFieldsRaw =
      (formData.get("custom_fields") as string)?.trim() || null;
    // for_sale / for_rent and other draft-only meta are persisted inside
    // custom_fields by buildDraftCustomFields (see DRAFT_*_KEY constants).
    const customFields = buildDraftCustomFields(customFieldsRaw, formData);

    const thumbFocal = parseThumbnailFocal(formData);
    const product = await productListService.create({
      partner_id: partnerId,
      equipment_model_id: productType === "equipment" ? modelId : null,
      attachment_model_id: productType === "attachment" ? modelId : null,
      description,
      township_id: townshipId,
      address,
      hide_address: hideAddress,
      hide_partner: hidePartner,
      custom_fields: customFields,
      ...thumbFocal,
      is_draft: 1,
      created_by: userId,
    });

    let productId = (product as unknown as Record<string, unknown>)
      ?.id as number;
    if (!productId) {
      const lastRow = await d1.query<{ id: number }>(
        "SELECT id FROM product_list ORDER BY id DESC LIMIT 1",
      );
      productId = lastRow.results[0]?.id;
    }

    // Upload thumbnail if provided
    const thumbFields = await uploadProductThumbnail(formData, productId, null);
    if (thumbFields.thumbnail_url) {
      uploadedKeys.push(thumbFields.thumbnail_url);
      if (thumbFields.thumbnail_sm_url) uploadedKeys.push(thumbFields.thumbnail_sm_url);
      await productListService.update(productId, {
        ...thumbFields,
        ...thumbFocal,
      });
    }

    // Upload photos if provided
    const photos = await processProductPhotos(formData, productId);
    uploadedKeys.push(...photos.map((p) => p.key));
    uploadedKeys.push(...photos.map((p) => p.thumbKey).filter((k): k is string => !!k));
    if (photos.length > 0) {
      await syncProductImages(productId, photos, userId);
    }

    auditLog(userId, "saved draft | id=" + productId);
    return { success: true, draftId: productId };
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => deleteFile(key)));
    return {
      success: false,
      error: getErrorMessage(error, "Failed to save draft"),
    };
  }
}

/** Update an existing draft. Only the creator can update. */
export async function updateDraft(productListId: number, formData: FormData) {
  try {
    const userId = await requireAuth();

    // Verify ownership
    const existing = await d1.query<{
      created_by: number | null;
      is_draft: number;
      thumbnail_url: string | null;
      thumbnail_sm_url: string | null;
      thumbnail_blurhash: string | null;
    }>(
      "SELECT created_by, is_draft, thumbnail_url, thumbnail_sm_url, thumbnail_blurhash FROM product_list WHERE id = ?",
      [productListId],
    );
    const row = existing.results[0];
    if (!row || row.is_draft !== 1) {
      return { success: false, error: "Draft not found" };
    }
    if (row.created_by !== userId) {
      return { success: false, error: "Not authorized to edit this draft" };
    }

    const productType = formData.get("product_type") as string | null;
    const modelId = formData.get("model_id")
      ? Number(formData.get("model_id"))
      : null;
    const partnerId = formData.get("partner_id")
      ? Number(formData.get("partner_id"))
      : null;
    const townshipId = formData.get("township_id")
      ? Number(formData.get("township_id"))
      : null;
    const description = (formData.get("description") as string)?.trim() || null;
    const address = (formData.get("address") as string)?.trim() || null;
    const hideAddress = formData.get("hide_address") === "1" ? 1 : 0;
    const hidePartner = formData.get("hide_partner") === "1" ? 1 : 0;
    const customFieldsRaw =
      (formData.get("custom_fields") as string)?.trim() || null;
    // for_sale / for_rent and other draft-only meta are persisted inside
    // custom_fields by buildDraftCustomFields (see DRAFT_*_KEY constants).
    const customFields = buildDraftCustomFields(customFieldsRaw, formData);

    // Handle thumbnail
    const thumbnailFields = await uploadProductThumbnail(
      formData,
      productListId,
      row,
    );

    const thumbFocal = parseThumbnailFocal(formData);
    await productListService.update(productListId, {
      partner_id: partnerId,
      equipment_model_id: productType === "equipment" ? modelId : null,
      attachment_model_id: productType === "attachment" ? modelId : null,
      description,
      township_id: townshipId,
      address,
      hide_address: hideAddress,
      hide_partner: hidePartner,
      custom_fields: customFields,
      ...thumbnailFields,
      ...thumbFocal,
    });

    // Sync photos
    const photos = await processProductPhotos(formData, productListId);
    await syncProductImages(productListId, photos, userId);

    // Clean up old thumbnail
    await cleanupProductThumbnail(row, thumbnailFields);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update draft"),
    };
  }
}

/** Submit a draft as a full listing. Validates required fields, creates listing rows. */
export async function submitDraft(productListId: number, formData: FormData) {
  const uploadedKeys: string[] = [];
  try {
    const userId = await requireAuth();

    // Verify ownership + draft status
    const existing = await d1.query<{
      created_by: number | null;
      is_draft: number;
      thumbnail_url: string | null;
      thumbnail_sm_url: string | null;
      thumbnail_blurhash: string | null;
    }>(
      "SELECT created_by, is_draft, thumbnail_url, thumbnail_sm_url, thumbnail_blurhash FROM product_list WHERE id = ?",
      [productListId],
    );
    const row = existing.results[0];
    if (!row || row.is_draft !== 1) {
      return { success: false, error: "Draft not found" };
    }
    if (row.created_by !== userId) {
      return { success: false, error: "Not authorized to submit this draft" };
    }

    // Extract and validate required fields
    const productFields = extractProductFields(formData);
    const forSale = formData.get("for_sale") === "1";
    const forRent = formData.get("for_rent") === "1";
    const productType = formData.get("product_type") as
      | "equipment"
      | "attachment";
    const isHidden = formData.get("is_hidden") === "1" ? 1 : 0;
    const saleHidePrice = formData.get("sale_hide_price") === "1" ? 1 : 0;
    const rentHidePrice = formData.get("rent_hide_price") === "1" ? 1 : 0;
    const addToFeatured = formData.get("add_to_featured") === "1";

    if (!forSale && !forRent) {
      return { success: false, error: "Select at least one listing type" };
    }
    if (!productFields.partner_id) {
      return { success: false, error: "Partner is required" };
    }
    if (
      !productFields.equipment_model_id &&
      !productFields.attachment_model_id
    ) {
      return { success: false, error: "Model is required" };
    }

    // Check permissions
    if (forSale) await requirePermission("sale_listings", "create");
    if (forRent) await requirePermission("rent_listings", "create");

    const canApproveSale =
      forSale && (await hasApprovePermission("sale_listings"));
    const canApproveRent =
      forRent && (await hasApprovePermission("rent_listings"));

    // Handle thumbnail
    const thumbnailFields = await uploadProductThumbnail(
      formData,
      productListId,
      row,
    );
    if (thumbnailFields.thumbnail_url && thumbnailFields.thumbnail_url !== row.thumbnail_url) {
      uploadedKeys.push(thumbnailFields.thumbnail_url);
      if (thumbnailFields.thumbnail_sm_url) {
        uploadedKeys.push(thumbnailFields.thumbnail_sm_url);
      }
    }

    // Update product_list: set is_draft=0 and update all fields
    const thumbFocal = parseThumbnailFocal(formData);
    await productListService.update(productListId, {
      ...productFields,
      ...thumbnailFields,
      ...thumbFocal,
      is_draft: 0,
    });

    // Sync photos
    const photos = await processProductPhotos(formData, productListId);
    if (photos.length > 0) {
      await syncProductImages(productListId, photos, userId);
    }

    // Clean up old thumbnail
    await cleanupProductThumbnail(row, thumbnailFields);

    // Create sale listing
    let saleListingId: number | null = null;
    if (forSale) {
      const saleCustomId = await generateListingId("sale", productType);
      const saleStatusName = canApproveSale ? "Approved" : "Pending";
      const statusResult = await d1.query<{ id: number }>(
        "SELECT id FROM approval_status_type WHERE status_name = ?",
        [saleStatusName],
      );
      const saleApproveStatusId = statusResult.results[0]?.id ?? null;

      const saleDisplayOrder = await getNextDisplayOrder("sale_listing");
      const saleResult = await saleListingService.create({
        product_list_id: productListId,
        custom_id: saleCustomId,
        condition_type_id: formData.get("condition_type_id")
          ? Number(formData.get("condition_type_id"))
          : null,
        mmk_price: formData.get("sale_mmk_price")
          ? Number(formData.get("sale_mmk_price"))
          : null,
        usd_price: formData.get("sale_usd_price")
          ? Number(formData.get("sale_usd_price"))
          : null,
        hide_price: saleHidePrice,
        is_hidden: isHidden,
        is_sold_out: 0,
        display_currency:
          (formData.get("sale_display_currency") as string) || "MMK",
        use_system_rate:
          formData.get("sale_use_system_rate") === "0" ? 0 : 1,
        approve_status_id: saleApproveStatusId,
        approved_by: canApproveSale ? userId : null,
        approved_at: canApproveSale ? new Date().toISOString() : null,
        created_by: userId,
        display_order: saleDisplayOrder,
      });
      saleListingId = (saleResult as unknown as { id: number })?.id ?? null;
      if (!saleListingId) {
        const lastRow = await d1.query<{ id: number }>(
          "SELECT id FROM sale_listing ORDER BY id DESC LIMIT 1",
        );
        saleListingId = lastRow.results[0]?.id ?? null;
      }
    }

    // Create rent listing
    let rentListingId: number | null = null;
    if (forRent) {
      const rentCustomId = await generateListingId("rent", productType);
      const rentStatusName = canApproveRent ? "Approved" : "Pending";
      const statusResult = await d1.query<{ id: number }>(
        "SELECT id FROM approval_status_type WHERE status_name = ?",
        [rentStatusName],
      );
      const rentApproveStatusId = statusResult.results[0]?.id ?? null;

      const rentDisplayOrder = await getNextDisplayOrder("rent_listing");
      const rentResult = await rentListingService.create({
        product_list_id: productListId,
        custom_id: rentCustomId,
        mmk_price: formData.get("rent_mmk_price")
          ? Number(formData.get("rent_mmk_price"))
          : null,
        usd_price: formData.get("rent_usd_price")
          ? Number(formData.get("rent_usd_price"))
          : null,
        hide_price: rentHidePrice,
        is_hidden: isHidden,
        is_rented: 0,
        display_currency:
          (formData.get("rent_display_currency") as string) || "MMK",
        use_system_rate:
          formData.get("rent_use_system_rate") === "0" ? 0 : 1,
        rental_unit:
          (formData.get("rental_unit") as RentalUnit) || "per_day",
        approve_status_id: rentApproveStatusId,
        approved_by: canApproveRent ? userId : null,
        approved_at: canApproveRent ? new Date().toISOString() : null,
        created_by: userId,
        display_order: rentDisplayOrder,
      });
      rentListingId = (rentResult as unknown as { id: number })?.id ?? null;
      if (!rentListingId) {
        const lastRow = await d1.query<{ id: number }>(
          "SELECT id FROM rent_listing ORDER BY id DESC LIMIT 1",
        );
        rentListingId = lastRow.results[0]?.id ?? null;
      }
    }

    // Add to featured if requested (only for auto-approved)
    if (addToFeatured) {
      const display_order = await getLastDisplayOrder("featured_listing");
      if (forSale && saleListingId && canApproveSale) {
        await featuredListingService.create({
          sale_listing_id: saleListingId,
          rent_listing_id: null,
          display_order,
          created_by: userId,
        });
      } else if (forRent && rentListingId && canApproveRent) {
        await featuredListingService.create({
          sale_listing_id: null,
          rent_listing_id: rentListingId,
          display_order,
          created_by: userId,
        });
      }
    }

    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    if (addToFeatured) invalidateTag(CACHE_TAGS.FEATURED_LISTINGS);

    // Notifications for non-auto-approved
    const modelName = await getModelNameForProduct(productListId);
    if (forSale && saleListingId && !canApproveSale) {
      notifyListingSubmitted(saleListingId, "sale", modelName, userId).catch(
        () => {},
      );
    }
    if (forRent && rentListingId && !canApproveRent) {
      notifyListingSubmitted(rentListingId, "rent", modelName, userId).catch(
        () => {},
      );
    }

    auditLog(userId, "submitted draft as listing | product=" + productListId);
    return { success: true };
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => deleteFile(key)));
    return {
      success: false,
      error: getErrorMessage(error, "Failed to submit draft"),
    };
  }
}

/** Delete a draft. Only the creator can delete. Cleans up R2 files. */
export async function deleteDraft(productListId: number) {
  try {
    const userId = await requireAuth();

    const existing = await d1.query<{
      created_by: number | null;
      is_draft: number;
    }>("SELECT created_by, is_draft FROM product_list WHERE id = ?", [
      productListId,
    ]);
    const row = existing.results[0];
    if (!row || row.is_draft !== 1) {
      return { success: false, error: "Draft not found" };
    }
    if (row.created_by !== userId) {
      return { success: false, error: "Not authorized to delete this draft" };
    }

    // Soft delete the product_list (R2 files cleaned up when permanently deleting from trash)
    await productListService.softDelete(productListId, userId);
    await saveTrashMetadata("product_list", productListId, userId);

    auditLog(userId, "deleted draft | id=" + productListId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete draft"),
    };
  }
}

/** Get all drafts for the current user */
export async function getDraftListings(): Promise<DraftListingWithDetails[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const result = await d1.query<DraftListingWithDetails>(
    `SELECT
      pl.id, pl.equipment_model_id, pl.attachment_model_id,
      pl.partner_id, pl.township_id, pl.description,
      pl.thumbnail_url, pl.hide_partner, pl.address, pl.hide_address, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE
        WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment'
        WHEN pl.attachment_model_id IS NOT NULL THEN 'attachment'
        ELSE NULL
      END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      pl.created_at, pl.updated_at
    FROM product_list pl
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN township t ON pl.township_id = t.township_id
    WHERE pl.is_draft = 1 AND pl.created_by = ? AND pl.deleted_at IS NULL
    ORDER BY pl.updated_at DESC`,
    [session.user.id],
  );
  return result.results;
}

/** Get a single draft by ID (for edit page). Only the creator can view. */
export async function getDraftById(
  id: number,
): Promise<DraftListingWithDetails | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const result = await d1.query<DraftListingWithDetails>(
    `SELECT
      pl.id, pl.equipment_model_id, pl.attachment_model_id,
      pl.partner_id, pl.township_id, pl.description,
      pl.thumbnail_url, pl.hide_partner, pl.address, pl.hide_address, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE
        WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment'
        WHEN pl.attachment_model_id IS NOT NULL THEN 'attachment'
        ELSE NULL
      END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      pl.created_at, pl.updated_at
    FROM product_list pl
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN township t ON pl.township_id = t.township_id
    WHERE pl.id = ? AND pl.is_draft = 1 AND pl.created_by = ?`,
    [id, session.user.id],
  );
  return result.results[0] ?? null;
}
