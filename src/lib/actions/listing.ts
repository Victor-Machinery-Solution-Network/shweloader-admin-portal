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
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getLastDisplayOrder } from "@/lib/actions/reorder";
import { nKeysBetween } from "@/lib/utils/display-order";
import { processFileField, processFileWithOriginalName, deleteFile, cleanupOldFile } from "@/lib/actions/upload-helpers";
import { isR2Key, slugify } from "@/lib/api/r2-client";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  FeaturedListingWithDetails,
  DraftListingWithDetails,
  ProductImage,
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

// ─── Helper: process product photos from form data ──────────────────────────

/**
 * Process product photos from FormData.
 * - `photo_url_N`: existing R2 keys to keep
 * - `photo_file_N`: new File objects to upload
 * Returns array of R2 keys (existing + newly uploaded) in order.
 */
async function processProductPhotos(
  formData: FormData,
  productListId: number,
): Promise<string[]> {
  const r2Path = `products/photos/${productListId}/`;

  // 1. Collect all entries (preserving order)
  type PhotoEntry =
    | { type: "url"; url: string }
    | { type: "file"; file: File };
  const entries: PhotoEntry[] = [];
  let i = 0;

  while (formData.has(`photo_url_${i}`) || formData.has(`photo_file_${i}`)) {
    const existingKey = formData.get(`photo_url_${i}`) as string | null;
    if (existingKey?.trim()) {
      // Reject keys that look like URLs or contain path traversal
      if (!isR2Key(existingKey.trim())) {
        throw new Error("Invalid photo key detected");
      }
      entries.push({ type: "url", url: existingKey.trim() });
    } else {
      const file = formData.get(`photo_file_${i}`);
      if (file && file instanceof File && file.size > 0) {
        entries.push({ type: "file", file });
      }
    }
    i++;
  }

  // 2. Upload all new files with index suffix to prevent filename collisions
  //    e.g. two "front.jpg" files become "front-0.webp" and "front-1.webp"
  const results = await Promise.all(
    entries.map(async (entry, idx) => {
      if (entry.type === "url") return entry.url;
      const nameWithoutExt = entry.file.name.replace(/\.[^.]+$/, "");
      const uniqueName = `${slugify(nameWithoutExt)}-${idx}`;
      const tempFormData = new FormData();
      tempFormData.set("photo", entry.file);
      return processFileField(tempFormData, "photo", r2Path, uniqueName);
    }),
  );

  return results.filter((key): key is string => key !== null);
}

// ─── Helper: sync product images (with R2 cleanup) ─────────────────────────

async function syncProductImages(
  productListId: number,
  newKeys: string[],
  uploadedBy: number | null,
) {
  // Get existing images
  const existing = await d1.query<ProductImage>(
    "SELECT image_id, url FROM product_image WHERE product_list_id = ?",
    [productListId],
  );

  // Find keys that are no longer referenced
  const newKeySet = new Set(newKeys);
  const removedKeys = existing.results
    .map((img) => img.url)
    .filter((key) => !newKeySet.has(key));

  // 1. Delete existing DB records
  if (existing.results.length > 0) {
    await Promise.all(
      existing.results.map((img) => productImageService.delete(img.image_id)),
    );
  }

  // 2. Create new image records (DB must be consistent before R2 cleanup)
  if (newKeys.length > 0) {
    const orderKeys = nKeysBetween(null, null, newKeys.length);
    await Promise.all(
      newKeys.map((key, i) =>
        productImageService.create({
          product_list_id: productListId,
          url: key,
          display_order: orderKeys[i],
          uploaded_by: uploadedBy,
          active: 1,
        }),
      ),
    );
  }

  // 3. Clean up removed files from R2 (after DB is consistent)
  await Promise.allSettled(removedKeys.map((key) => deleteFile(key)));
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

  const hidePartner = formData.get("hide_partner") === "1" ? 1 : 0;
  const customFields =
    (formData.get("custom_fields") as string)?.trim() || null;

  return {
    partner_id: partnerId,
    equipment_model_id: productType === "equipment" ? modelId : null,
    attachment_model_id: productType === "attachment" ? modelId : null,
    description,
    township_id: townshipId,
    hide_partner: hidePartner,
    custom_fields: customFields,
  };
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

async function createProductAndGetId(
  productFields: ReturnType<typeof extractProductFields> & { thumbnail_url?: string | null },
  created_by: number | null,
) {
  const product = await productListService.create({
    ...productFields,
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
    const hidePrice = formData.get("hide_price") === "1" ? 1 : 0;
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
    const canApproveSale = forSale && await hasApprovePermission("sale_listings");
    const canApproveRent = forRent && await hasApprovePermission("rent_listings");

    // 1. Create product_list first (need ID for unique R2 paths)
    const productId = await createProductAndGetId(
      { ...productFields, thumbnail_url: null },
      created_by,
    );

    // 2. Upload thumbnail using product_list_id for unique path
    const thumbnail_url = await processFileField(
      formData, "thumbnail_url", "products/thumbnails/", String(productId),
    );
    if (thumbnail_url) {
      uploadedKeys.push(thumbnail_url);
      await productListService.update(productId, { thumbnail_url });
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
        hide_price: hidePrice,
        is_hidden: isHidden,
        is_sold_out: 0,
        approve_status_id: saleApproveStatusId,
        approved_by: canApproveSale ? created_by : null,
        approved_at: canApproveSale ? new Date().toISOString() : null,
        created_by,
      });
      saleListingId =
        (saleResult as unknown as { id: number })?.id ?? null;
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
        hide_price: hidePrice,
        is_hidden: isHidden,
        approve_status_id: rentApproveStatusId,
        approved_by: canApproveRent ? created_by : null,
        approved_at: canApproveRent ? new Date().toISOString() : null,
        created_by,
      });
      rentListingId =
        (rentResult as unknown as { id: number })?.id ?? null;
      if (!rentListingId) {
        const lastRow = await d1.query<{ id: number }>(
          "SELECT id FROM rent_listing ORDER BY id DESC LIMIT 1",
        );
        rentListingId = lastRow.results[0]?.id ?? null;
      }
    }

    // 5. Upload and create product photos (using productId for unique R2 path)
    const photoKeys = await processProductPhotos(formData, productId);
    uploadedKeys.push(...photoKeys);
    if (photoKeys.length > 0) {
      await syncProductImages(productId, photoKeys, created_by);
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
      notifyListingSubmitted(saleListingId, "sale", modelName, created_by).catch(() => {});
    }
    if (forRent && rentListingId && !canApproveRent) {
      notifyListingSubmitted(rentListingId, "rent", modelName, created_by).catch(() => {});
    }

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
    await requirePermission("sale_listings", "edit");
    // Get existing sale listing to find product_list_id and thumbnail
    const existing = await d1.query<{ product_list_id: number; thumbnail_url: string | null }>(
      "SELECT sl.product_list_id, pl.thumbnail_url FROM sale_listing sl JOIN product_list pl ON sl.product_list_id = pl.id WHERE sl.id = ?",
      [saleId],
    );
    const productListId = existing.results[0]?.product_list_id;
    if (!productListId) {
      return { success: false, error: "Sale listing not found" };
    }

    const productFields = extractProductFields(formData);

    // 1. Handle thumbnail upload (using productListId for unique R2 path)
    const thumbnail_url = await processFileField(
      formData, "thumbnail_url", "products/thumbnails/", String(productListId), existing.results[0]?.thumbnail_url,
    );

    // 2. Update product_list
    await productListService.update(productListId, { ...productFields, thumbnail_url });

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
      hide_price: formData.get("hide_price") === "1" ? 1 : 0,
      is_hidden: formData.get("is_hidden") === "1" ? 1 : 0,
    });

    // 4. Sync product photos
    const photoKeys = await processProductPhotos(formData, productListId);
    await syncProductImages(productListId, photoKeys, null);

    // 5. Clean up old thumbnail from R2 (after D1 is consistent)
    await cleanupOldFile(existing.results[0]?.thumbnail_url, thumbnail_url);

    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
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
    // Get product_list_id for cascading soft delete
    const existing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM sale_listing WHERE id = ?",
      [saleId],
    );
    const productListId = existing.results[0]?.product_list_id;

    // Soft delete the sale listing
    await saleListingService.softDelete(saleId, deletedBy);

    const batchId = crypto.randomUUID();
    saveTrashMetadata("sale_listing", saleId, deletedBy, { batchId }).catch(() => {});

    // Soft delete product_list if no other listing references it
    if (productListId) {
      const siblings = await d1.query<{ cnt: number }>(
        "SELECT (SELECT COUNT(*) FROM sale_listing WHERE product_list_id = ? AND deleted_at IS NULL) + (SELECT COUNT(*) FROM rent_listing WHERE product_list_id = ? AND deleted_at IS NULL) AS cnt",
        [productListId, productListId],
      );
      const remaining = siblings.results[0]?.cnt ?? 0;

      if (remaining === 0) {
        await productListService.softDelete(productListId, deletedBy);
        saveTrashMetadata("product_list", productListId, deletedBy, { batchId }).catch(() => {});
      }
    }

    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
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
    await requirePermission("rent_listings", "edit");
    // Get existing rent listing to find product_list_id and thumbnail
    const existing = await d1.query<{ product_list_id: number; thumbnail_url: string | null }>(
      "SELECT rl.product_list_id, pl.thumbnail_url FROM rent_listing rl JOIN product_list pl ON rl.product_list_id = pl.id WHERE rl.id = ?",
      [rentId],
    );
    const productListId = existing.results[0]?.product_list_id;
    if (!productListId) {
      return { success: false, error: "Rent listing not found" };
    }

    const productFields = extractProductFields(formData);

    // 1. Handle thumbnail upload (using productListId for unique R2 path)
    const thumbnail_url = await processFileField(
      formData, "thumbnail_url", "products/thumbnails/", String(productListId), existing.results[0]?.thumbnail_url,
    );

    // 2. Update product_list
    await productListService.update(productListId, { ...productFields, thumbnail_url });

    // 3. Update rent_listing
    await rentListingService.update(rentId, {
      mmk_price: formData.get("rent_mmk_price")
        ? Number(formData.get("rent_mmk_price"))
        : null,
      usd_price: formData.get("rent_usd_price")
        ? Number(formData.get("rent_usd_price"))
        : null,
      hide_price: formData.get("hide_price") === "1" ? 1 : 0,
      is_hidden: formData.get("is_hidden") === "1" ? 1 : 0,
    });

    // 4. Sync product photos
    const photoKeys = await processProductPhotos(formData, productListId);
    await syncProductImages(productListId, photoKeys, null);

    // 5. Clean up old thumbnail from R2 (after D1 is consistent)
    await cleanupOldFile(existing.results[0]?.thumbnail_url, thumbnail_url);

    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
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
    // Get product_list_id for cascading soft delete
    const existing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM rent_listing WHERE id = ?",
      [rentId],
    );
    const productListId = existing.results[0]?.product_list_id;

    // Soft delete the rent listing
    await rentListingService.softDelete(rentId, deletedBy);

    const batchId = crypto.randomUUID();
    saveTrashMetadata("rent_listing", rentId, deletedBy, { batchId }).catch(() => {});

    // Soft delete product_list if no other listing references it
    if (productListId) {
      const siblings = await d1.query<{ cnt: number }>(
        "SELECT (SELECT COUNT(*) FROM sale_listing WHERE product_list_id = ? AND deleted_at IS NULL) + (SELECT COUNT(*) FROM rent_listing WHERE product_list_id = ? AND deleted_at IS NULL) AS cnt",
        [productListId, productListId],
      );
      const remaining = siblings.results[0]?.cnt ?? 0;

      if (remaining === 0) {
        await productListService.softDelete(productListId, deletedBy);
        saveTrashMetadata("product_list", productListId, deletedBy, { batchId }).catch(() => {});
      }
    }

    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete rent listing"),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TOGGLE ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function toggleSaleHidden(id: number) {
  try {
    await requirePermission("sale_listings", "edit");
    const current = await d1.query<{ is_hidden: number }>(
      "SELECT is_hidden FROM sale_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.is_hidden === 1 ? 0 : 1;
    await saleListingService.update(id, { is_hidden: newVal });
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
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
    await requirePermission("rent_listings", "edit");
    const current = await d1.query<{ is_hidden: number }>(
      "SELECT is_hidden FROM rent_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.is_hidden === 1 ? 0 : 1;
    await rentListingService.update(id, { is_hidden: newVal });
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
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
    await requirePermission("sale_listings", "edit");
    const current = await d1.query<{ is_sold_out: number }>(
      "SELECT is_sold_out FROM sale_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.is_sold_out === 1 ? 0 : 1;
    await saleListingService.update(id, { is_sold_out: newVal });
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
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
    await requirePermission("sale_listings", "edit");
    const current = await d1.query<{ hide_price: number }>(
      "SELECT hide_price FROM sale_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.hide_price === 1 ? 0 : 1;
    await saleListingService.update(id, { hide_price: newVal });
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    return { success: true, hide_price: newVal };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle price visibility"),
    };
  }
}

export async function toggleRentHidePrice(id: number) {
  try {
    await requirePermission("rent_listings", "edit");
    const current = await d1.query<{ hide_price: number }>(
      "SELECT hide_price FROM rent_listing WHERE id = ?",
      [id],
    );
    const newVal = current.results[0]?.hide_price === 1 ? 0 : 1;
    await rentListingService.update(id, { hide_price: newVal });
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
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
    await requirePermission("featured_listings", "delete");
    await featuredListingService.delete(featuredId);
    invalidateTag(CACHE_TAGS.FEATURED_LISTINGS);
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
      sl.mmk_price, sl.usd_price, sl.hide_price, sl.is_hidden, sl.is_sold_out, pl.hide_partner,
      sl.approve_status_id, sl.rejection_reason, sl.approved_at,
      sl.created_at, sl.display_order,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id
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
      rl.mmk_price, rl.usd_price, rl.hide_price, rl.is_hidden, pl.hide_partner,
      rl.approve_status_id, rl.rejection_reason, rl.approved_at,
      rl.created_at, rl.display_order,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id
    FROM rent_listing rl
    JOIN product_list pl ON rl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN township t ON pl.township_id = t.township_id
    LEFT JOIN approval_status_type ast ON rl.approve_status_id = ast.id
    LEFT JOIN featured_listing fl ON fl.rent_listing_id = rl.id
    WHERE rl.deleted_at IS NULL AND pl.deleted_at IS NULL
    ORDER BY rl.display_order ASC, rl.created_at DESC`,
  );
  return result.results;
}

export async function getFeaturedListingsWithDetails(): Promise<
  FeaturedListingWithDetails[]
> {
  const result = await d1.query<FeaturedListingWithDetails>(
    `SELECT
      fl.id, fl.sale_listing_id, fl.rent_listing_id, fl.display_order,
      CASE WHEN fl.sale_listing_id IS NOT NULL THEN 'sale' ELSE 'rent' END AS listing_type,
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
  return result.results;
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
      sl.mmk_price, sl.usd_price, sl.hide_price, sl.is_hidden, sl.is_sold_out, pl.hide_partner,
      sl.approve_status_id, sl.rejection_reason, sl.approved_at,
      sl.created_at,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id
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
    WHERE sl.id = ?`,
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
      rl.mmk_price, rl.usd_price, rl.hide_price, rl.is_hidden, pl.hide_partner,
      rl.approve_status_id, rl.rejection_reason, rl.approved_at,
      rl.created_at,
      pl.thumbnail_url, pl.description, pl.township_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id, pl.custom_fields,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      t.name AS township_name,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id
    FROM rent_listing rl
    JOIN product_list pl ON rl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN township t ON pl.township_id = t.township_id
    LEFT JOIN approval_status_type ast ON rl.approve_status_id = ast.id
    LEFT JOIN featured_listing fl ON fl.rent_listing_id = rl.id
    WHERE rl.id = ?`,
    [id],
  );
  return result.results[0] ?? null;
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

    // Notify the creator (fire-and-forget)
    const listing = await d1.query<{ product_list_id: number; created_by: number | null }>(
      "SELECT product_list_id, created_by FROM sale_listing WHERE id = ?",
      [id],
    );
    const row = listing.results[0];
    if (row?.created_by) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingApproved(id, "sale", modelName, row.created_by, userId).catch(() => {});
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

    // Notify the creator (fire-and-forget)
    const listing = await d1.query<{ product_list_id: number; created_by: number | null }>(
      "SELECT product_list_id, created_by FROM sale_listing WHERE id = ?",
      [id],
    );
    const row = listing.results[0];
    if (row?.created_by) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingRework(id, "sale", modelName, row.created_by, userId, reason).catch(() => {});
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

    // Notify the creator (fire-and-forget)
    const listing = await d1.query<{ product_list_id: number; created_by: number | null }>(
      "SELECT product_list_id, created_by FROM rent_listing WHERE id = ?",
      [id],
    );
    const row = listing.results[0];
    if (row?.created_by) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingApproved(id, "rent", modelName, row.created_by, userId).catch(() => {});
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

    // Notify the creator (fire-and-forget)
    const listing = await d1.query<{ product_list_id: number; created_by: number | null }>(
      "SELECT product_list_id, created_by FROM rent_listing WHERE id = ?",
      [id],
    );
    const row = listing.results[0];
    if (row?.created_by) {
      const modelName = await getModelNameForProduct(row.product_list_id);
      notifyListingRework(id, "rent", modelName, row.created_by, userId, reason).catch(() => {});
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
    const modelId = formData.get("model_id") ? Number(formData.get("model_id")) : null;
    const partnerId = formData.get("partner_id") ? Number(formData.get("partner_id")) : null;
    const townshipId = formData.get("township_id") ? Number(formData.get("township_id")) : null;
    const description = (formData.get("description") as string)?.trim() || null;
    const hidePartner = formData.get("hide_partner") === "1" ? 1 : 0;
    const customFields = (formData.get("custom_fields") as string)?.trim() || null;

    const product = await productListService.create({
      partner_id: partnerId,
      equipment_model_id: productType === "equipment" ? modelId : null,
      attachment_model_id: productType === "attachment" ? modelId : null,
      description,
      township_id: townshipId,
      hide_partner: hidePartner,
      custom_fields: customFields,
      is_draft: 1,
      created_by: userId,
    });

    let productId = (product as unknown as Record<string, unknown>)?.id as number;
    if (!productId) {
      const lastRow = await d1.query<{ id: number }>(
        "SELECT id FROM product_list ORDER BY id DESC LIMIT 1",
      );
      productId = lastRow.results[0]?.id;
    }

    // Upload thumbnail if provided
    const thumbnail_url = await processFileField(
      formData, "thumbnail_url", "products/thumbnails/", String(productId),
    );
    if (thumbnail_url) {
      uploadedKeys.push(thumbnail_url);
      await productListService.update(productId, { thumbnail_url });
    }

    // Upload photos if provided
    const photoKeys = await processProductPhotos(formData, productId);
    uploadedKeys.push(...photoKeys);
    if (photoKeys.length > 0) {
      await syncProductImages(productId, photoKeys, userId);
    }

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
    const existing = await d1.query<{ created_by: number | null; is_draft: number; thumbnail_url: string | null }>(
      "SELECT created_by, is_draft, thumbnail_url FROM product_list WHERE id = ?",
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
    const modelId = formData.get("model_id") ? Number(formData.get("model_id")) : null;
    const partnerId = formData.get("partner_id") ? Number(formData.get("partner_id")) : null;
    const townshipId = formData.get("township_id") ? Number(formData.get("township_id")) : null;
    const description = (formData.get("description") as string)?.trim() || null;
    const hidePartner = formData.get("hide_partner") === "1" ? 1 : 0;
    const customFields = (formData.get("custom_fields") as string)?.trim() || null;

    // Handle thumbnail
    const thumbnail_url = await processFileField(
      formData, "thumbnail_url", "products/thumbnails/", String(productListId), row.thumbnail_url,
    );

    await productListService.update(productListId, {
      partner_id: partnerId,
      equipment_model_id: productType === "equipment" ? modelId : null,
      attachment_model_id: productType === "attachment" ? modelId : null,
      description,
      township_id: townshipId,
      hide_partner: hidePartner,
      custom_fields: customFields,
      thumbnail_url,
    });

    // Sync photos
    const photoKeys = await processProductPhotos(formData, productListId);
    await syncProductImages(productListId, photoKeys, userId);

    // Clean up old thumbnail
    await cleanupOldFile(row.thumbnail_url, thumbnail_url);

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
    const existing = await d1.query<{ created_by: number | null; is_draft: number; thumbnail_url: string | null }>(
      "SELECT created_by, is_draft, thumbnail_url FROM product_list WHERE id = ?",
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
    const productType = formData.get("product_type") as "equipment" | "attachment";
    const isHidden = formData.get("is_hidden") === "1" ? 1 : 0;
    const hidePrice = formData.get("hide_price") === "1" ? 1 : 0;
    const addToFeatured = formData.get("add_to_featured") === "1";

    if (!forSale && !forRent) {
      return { success: false, error: "Select at least one listing type" };
    }
    if (!productFields.partner_id) {
      return { success: false, error: "Partner is required" };
    }
    if (!productFields.equipment_model_id && !productFields.attachment_model_id) {
      return { success: false, error: "Model is required" };
    }

    // Check permissions
    if (forSale) await requirePermission("sale_listings", "create");
    if (forRent) await requirePermission("rent_listings", "create");

    const canApproveSale = forSale && await hasApprovePermission("sale_listings");
    const canApproveRent = forRent && await hasApprovePermission("rent_listings");

    // Handle thumbnail
    const thumbnail_url = await processFileField(
      formData, "thumbnail_url", "products/thumbnails/", String(productListId), row.thumbnail_url,
    );
    if (thumbnail_url && thumbnail_url !== row.thumbnail_url) {
      uploadedKeys.push(thumbnail_url);
    }

    // Update product_list: set is_draft=0 and update all fields
    await productListService.update(productListId, {
      ...productFields,
      thumbnail_url,
      is_draft: 0,
    });

    // Sync photos
    const photoKeys = await processProductPhotos(formData, productListId);
    if (photoKeys.length > 0) {
      await syncProductImages(productListId, photoKeys, userId);
    }

    // Clean up old thumbnail
    await cleanupOldFile(row.thumbnail_url, thumbnail_url);

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
        hide_price: hidePrice,
        is_hidden: isHidden,
        is_sold_out: 0,
        approve_status_id: saleApproveStatusId,
        approved_by: canApproveSale ? userId : null,
        approved_at: canApproveSale ? new Date().toISOString() : null,
        created_by: userId,
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

      const rentResult = await rentListingService.create({
        product_list_id: productListId,
        custom_id: rentCustomId,
        mmk_price: formData.get("rent_mmk_price")
          ? Number(formData.get("rent_mmk_price"))
          : null,
        usd_price: formData.get("rent_usd_price")
          ? Number(formData.get("rent_usd_price"))
          : null,
        hide_price: hidePrice,
        is_hidden: isHidden,
        approve_status_id: rentApproveStatusId,
        approved_by: canApproveRent ? userId : null,
        approved_at: canApproveRent ? new Date().toISOString() : null,
        created_by: userId,
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
      notifyListingSubmitted(saleListingId, "sale", modelName, userId).catch(() => {});
    }
    if (forRent && rentListingId && !canApproveRent) {
      notifyListingSubmitted(rentListingId, "rent", modelName, userId).catch(() => {});
    }

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

    const existing = await d1.query<{ created_by: number | null; is_draft: number }>(
      "SELECT created_by, is_draft FROM product_list WHERE id = ?",
      [productListId],
    );
    const row = existing.results[0];
    if (!row || row.is_draft !== 1) {
      return { success: false, error: "Draft not found" };
    }
    if (row.created_by !== userId) {
      return { success: false, error: "Not authorized to delete this draft" };
    }

    // Soft delete the product_list (R2 files cleaned up when permanently deleting from trash)
    await productListService.softDelete(productListId, userId);
    saveTrashMetadata("product_list", productListId, userId).catch(() => {});

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
      pl.thumbnail_url, pl.hide_partner, pl.custom_fields,
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
      pl.thumbnail_url, pl.hide_partner, pl.custom_fields,
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
