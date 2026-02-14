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
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import type {
  SaleListingWithDetails,
  RentListingWithDetails,
  FeaturedListingWithDetails,
  ProductImage,
} from "@/types/listing";

// ─── Helper: parse image URLs from form data ───────────────────────────────

function parseImageUrls(formData: FormData): string[] {
  const urls: string[] = [];
  let i = 0;
  while (formData.has(`image_url_${i}`)) {
    const url = (formData.get(`image_url_${i}`) as string)?.trim();
    if (url) urls.push(url);
    i++;
  }
  return urls;
}

// ─── Helper: sync product images ────────────────────────────────────────────

async function syncProductImages(
  productListId: number,
  imageUrls: string[],
  uploadedBy: number | null,
) {
  // Delete existing images
  const existing = await d1.query<ProductImage>(
    "SELECT image_id FROM product_image WHERE product_list_id = ?",
    [productListId],
  );
  if (existing.results.length > 0) {
    await Promise.all(
      existing.results.map((img) => productImageService.delete(img.image_id)),
    );
  }

  // Create new images with display order
  if (imageUrls.length > 0) {
    await Promise.all(
      imageUrls.map((url, i) =>
        productImageService.create({
          product_list_id: productListId,
          url,
          display_order: String(i),
          uploaded_by: uploadedBy,
          active: 1,
        }),
      ),
    );
  }
}

// ─── Helper: extract common product fields from form ────────────────────────

function extractProductFields(formData: FormData) {
  const productType = formData.get("product_type") as string;
  const modelId = Number(formData.get("model_id"));
  const partnerId = Number(formData.get("partner_id"));
  const locationId = formData.get("location_id")
    ? Number(formData.get("location_id"))
    : null;
  const thumbnailUrl =
    (formData.get("thumbnail_url") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;

  return {
    partner_id: partnerId,
    equipment_model_id: productType === "equipment" ? modelId : null,
    attachment_model_id: productType === "attachment" ? modelId : null,
    thumbnail_url: thumbnailUrl,
    description,
    location_id: locationId,
  };
}

// ─── Helper: create product_list and get its ID ─────────────────────────────

async function createProductAndGetId(
  productFields: ReturnType<typeof extractProductFields>,
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

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED CREATE (supports sale, rent, or both)
// ═══════════════════════════════════════════════════════════════════════════

export async function createListing(formData: FormData) {
  try {
    const created_by = await getCurrentUserId();
    const productFields = extractProductFields(formData);
    const forSale = formData.get("for_sale") === "1";
    const forRent = formData.get("for_rent") === "1";

    if (!forSale && !forRent) {
      return { success: false, error: "Select at least one listing type" };
    }

    // 1. Create product_list
    const productId = await createProductAndGetId(productFields, created_by);

    // 2. Create sale_listing if selected
    if (forSale) {
      await saleListingService.create({
        product_list_id: productId,
        custom_id: (formData.get("custom_id") as string)?.trim() || null,
        condition: (formData.get("condition") as string)?.trim() || null,
        mmk_price: formData.get("mmk_price")
          ? Number(formData.get("mmk_price"))
          : null,
        usd_price: formData.get("usd_price")
          ? Number(formData.get("usd_price"))
          : null,
        is_hidden: 0,
        is_sold_out: 0,
        created_by,
      });
    }

    // 3. Create rent_listing if selected
    if (forRent) {
      await rentListingService.create({
        product_list_id: productId,
        custom_id: (formData.get("custom_id") as string)?.trim() || null,
        mmk_price: formData.get("mmk_price")
          ? Number(formData.get("mmk_price"))
          : null,
        usd_price: formData.get("usd_price")
          ? Number(formData.get("usd_price"))
          : null,
        is_hidden: 0,
        created_by,
      });
    }

    // 4. Create product images
    const imageUrls = parseImageUrls(formData);
    if (imageUrls.length > 0) {
      await syncProductImages(productId, imageUrls, created_by);
    }

    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    return { success: true };
  } catch (error) {
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
    // Get existing sale listing to find product_list_id
    const existing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM sale_listing WHERE id = ?",
      [saleId],
    );
    const productListId = existing.results[0]?.product_list_id;
    if (!productListId) {
      return { success: false, error: "Sale listing not found" };
    }

    const productFields = extractProductFields(formData);

    // 1. Update product_list
    await productListService.update(productListId, productFields);

    // 2. Update sale_listing
    await saleListingService.update(saleId, {
      custom_id: (formData.get("custom_id") as string)?.trim() || null,
      condition: (formData.get("condition") as string)?.trim() || null,
      mmk_price: formData.get("mmk_price")
        ? Number(formData.get("mmk_price"))
        : null,
      usd_price: formData.get("usd_price")
        ? Number(formData.get("usd_price"))
        : null,
    });

    // 3. Sync product images
    const imageUrls = parseImageUrls(formData);
    const uploadedBy = await getCurrentUserId();
    await syncProductImages(productListId, imageUrls, uploadedBy);

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
    // Get product_list_id to cascade delete
    const existing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM sale_listing WHERE id = ?",
      [saleId],
    );
    const productListId = existing.results[0]?.product_list_id;

    // Delete sale listing first, then product (cascade handles images)
    await saleListingService.delete(saleId);
    if (productListId) {
      await productListService.delete(productListId);
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
    const existing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM rent_listing WHERE id = ?",
      [rentId],
    );
    const productListId = existing.results[0]?.product_list_id;
    if (!productListId) {
      return { success: false, error: "Rent listing not found" };
    }

    const productFields = extractProductFields(formData);

    await productListService.update(productListId, productFields);

    await rentListingService.update(rentId, {
      custom_id: (formData.get("custom_id") as string)?.trim() || null,
      mmk_price: formData.get("mmk_price")
        ? Number(formData.get("mmk_price"))
        : null,
      usd_price: formData.get("usd_price")
        ? Number(formData.get("usd_price"))
        : null,
    });

    const imageUrls = parseImageUrls(formData);
    const uploadedBy = await getCurrentUserId();
    await syncProductImages(productListId, imageUrls, uploadedBy);

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
    const existing = await d1.query<{ product_list_id: number }>(
      "SELECT product_list_id FROM rent_listing WHERE id = ?",
      [rentId],
    );
    const productListId = existing.results[0]?.product_list_id;

    await rentListingService.delete(rentId);
    if (productListId) {
      await productListService.delete(productListId);
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

// ═══════════════════════════════════════════════════════════════════════════
// FEATURED LISTING ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function addToFeatured(type: "sale" | "rent", listingId: number) {
  try {
    const created_by = await getCurrentUserId();

    // Get max display order
    const maxOrder = await d1.query<{ max_order: string | null }>(
      "SELECT MAX(CAST(display_order AS INTEGER)) as max_order FROM featured_listing",
    );
    const nextOrder = String((Number(maxOrder.results[0]?.max_order) || 0) + 1);

    await featuredListingService.create({
      sale_listing_id: type === "sale" ? listingId : null,
      rent_listing_id: type === "rent" ? listingId : null,
      display_order: nextOrder,
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

export async function reorderFeatured(
  orderedItems: { id: number; display_order: string }[],
) {
  try {
    await Promise.all(
      orderedItems.map((item) =>
        featuredListingService.update(item.id, {
          display_order: item.display_order,
        }),
      ),
    );
    invalidateTag(CACHE_TAGS.FEATURED_LISTINGS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reorder featured listings"),
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
      sl.id, sl.custom_id, sl.product_list_id, sl.condition,
      sl.mmk_price, sl.usd_price, sl.is_hidden, sl.is_sold_out,
      sl.approve_status_id, sl.rejection_reason,
      sl.created_at,
      pl.thumbnail_url, pl.description, pl.location_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      l.city_name AS location_name,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id
    FROM sale_listing sl
    JOIN product_list pl ON sl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN customer c ON p.customer_id = c.customer_id
    LEFT JOIN location l ON pl.location_id = l.location_id
    LEFT JOIN approval_status_type ast ON sl.approve_status_id = ast.id
    LEFT JOIN featured_listing fl ON fl.sale_listing_id = sl.id
    ORDER BY sl.created_at DESC`,
  );
  return result.results;
}

export async function getRentListingsWithDetails(): Promise<
  RentListingWithDetails[]
> {
  const result = await d1.query<RentListingWithDetails>(
    `SELECT
      rl.id, rl.custom_id, rl.product_list_id,
      rl.mmk_price, rl.usd_price, rl.is_hidden,
      rl.approve_status_id, rl.rejection_reason,
      rl.created_at,
      pl.thumbnail_url, pl.description, pl.location_id,
      pl.equipment_model_id, pl.attachment_model_id, pl.partner_id,
      COALESCE(em.name, am.name) AS model_name,
      CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'equipment' ELSE 'attachment' END AS product_type,
      c.username AS partner_name,
      l.city_name AS location_name,
      ast.status_name AS approve_status_name,
      fl.id AS featured_id
    FROM rent_listing rl
    JOIN product_list pl ON rl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
    LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
    LEFT JOIN partner p ON pl.partner_id = p.id
    LEFT JOIN customer c ON p.customer_id = c.customer_id
    LEFT JOIN location l ON pl.location_id = l.location_id
    LEFT JOIN approval_status_type ast ON rl.approve_status_id = ast.id
    LEFT JOIN featured_listing fl ON fl.rent_listing_id = rl.id
    ORDER BY rl.created_at DESC`,
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
      COALESCE(em_s.name, am_s.name, em_r.name, am_r.name) AS model_name,
      COALESCE(c_s.username, c_r.username) AS partner_name,
      COALESCE(pl_s.thumbnail_url, pl_r.thumbnail_url) AS thumbnail_url
    FROM featured_listing fl
    LEFT JOIN sale_listing sl ON fl.sale_listing_id = sl.id
    LEFT JOIN product_list pl_s ON sl.product_list_id = pl_s.id
    LEFT JOIN equipment_model em_s ON pl_s.equipment_model_id = em_s.model_id
    LEFT JOIN attachment_model am_s ON pl_s.attachment_model_id = am_s.model_id
    LEFT JOIN partner p_s ON pl_s.partner_id = p_s.id
    LEFT JOIN customer c_s ON p_s.customer_id = c_s.customer_id
    LEFT JOIN rent_listing rl ON fl.rent_listing_id = rl.id
    LEFT JOIN product_list pl_r ON rl.product_list_id = pl_r.id
    LEFT JOIN equipment_model em_r ON pl_r.equipment_model_id = em_r.model_id
    LEFT JOIN attachment_model am_r ON pl_r.attachment_model_id = am_r.model_id
    LEFT JOIN partner p_r ON pl_r.partner_id = p_r.id
    LEFT JOIN customer c_r ON p_r.customer_id = c_r.customer_id
    ORDER BY CAST(fl.display_order AS INTEGER) ASC`,
  );
  return result.results;
}

// ─── Get product images for a product ───────────────────────────────────────

export async function getProductImages(
  productListId: number,
): Promise<ProductImage[]> {
  const result = await d1.query<ProductImage>(
    "SELECT * FROM product_image WHERE product_list_id = ? ORDER BY CAST(display_order AS INTEGER) ASC",
    [productListId],
  );
  return result.results;
}

// ─── Get approved partners for form dropdown ────────────────────────────────

export async function getApprovedPartners(): Promise<
  { id: number; customer_name: string; company_name: string | null }[]
> {
  const result = await d1.query<{
    id: number;
    customer_name: string;
    company_name: string | null;
  }>(
    `SELECT p.id, c.username AS customer_name, c.company_name
    FROM partner p
    JOIN customer c ON p.customer_id = c.customer_id
    JOIN partner_status_type pst ON p.status_id = pst.id
    WHERE pst.status_name = 'Approved'
    ORDER BY c.username ASC`,
  );
  return result.results;
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTING APPROVAL ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function approveListingSale(id: number) {
  try {
    const userId = await getCurrentUserId();
    await d1.query(
      `UPDATE sale_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Approved'), approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId, id],
    );
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to approve listing"),
    };
  }
}

export async function rejectListingSale(id: number, reason?: string) {
  try {
    const userId = await getCurrentUserId();
    await d1.query(
      `UPDATE sale_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Rejected'), approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId, reason || null, id],
    );
    invalidateTag(CACHE_TAGS.SALE_LISTINGS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reject listing"),
    };
  }
}

export async function approveListingRent(id: number) {
  try {
    const userId = await getCurrentUserId();
    await d1.query(
      `UPDATE rent_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Approved'), approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId, id],
    );
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to approve listing"),
    };
  }
}

export async function rejectListingRent(id: number, reason?: string) {
  try {
    const userId = await getCurrentUserId();
    await d1.query(
      `UPDATE rent_listing SET approve_status_id = (SELECT id FROM approval_status_type WHERE status_name = 'Rejected'), approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId, reason || null, id],
    );
    invalidateTag(CACHE_TAGS.RENT_LISTINGS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reject listing"),
    };
  }
}
