"use server";

import bcrypt from "bcryptjs";
import { appUserService, businessTypeService } from "@/lib/services/app-user";
import { partnerService } from "@/lib/services/partner";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";

const BCRYPT_ROUNDS = 12;
const PASSWORD_LENGTH = 12;
const PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";

function generatePassword(): string {
  const bytes = new Uint8Array(PASSWORD_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARSET[b % PASSWORD_CHARSET.length]).join("");
}

// ─── Create App User ──────────────────────────────────────────────────────────

export async function createAppUser(formData: FormData) {
  const username = formData.get("username") as string;
  const fullName = (formData.get("full_name") as string) || null;
  const email = (formData.get("email") as string) || null;
  const phone = formData.get("phone") as string;
  const companyName = (formData.get("company_name") as string) || null;
  const officeAddress = (formData.get("office_address") as string) || null;
  const businessTypeId = formData.get("business_type_id") as string;
  const businessTypeOther = (formData.get("business_type_other") as string) || null;
  const isApprovedPartner = formData.get("is_approved_partner") === "1";

  if (!username?.trim()) {
    return { success: false, error: "Username is required" };
  }
  if (!phone?.trim()) {
    return { success: false, error: "Phone number is required" };
  }

  try {
    const actorId = await requirePermission("users", "create");

    // Resolve business type ID — create an unlisted type if "Other" was specified
    let resolvedBtId: number | null = businessTypeId ? Number(businessTypeId) : null;

    if (businessTypeOther?.trim()) {
      const otherName = businessTypeOther.trim();

      // Check if this name already exists (avoid duplicates)
      const existing = await d1.query<{ business_type_id: number }>(
        "SELECT business_type_id FROM business_type WHERE name = ? LIMIT 1",
        [otherName],
      );

      if (existing.results.length > 0) {
        resolvedBtId = existing.results[0].business_type_id;
      } else {
        // Create new unlisted business type
        const created = await businessTypeService.create({
          name: otherName,
          is_listed: 0,
          created_by: actorId,
        });
        resolvedBtId = created.business_type_id;
      }
    }

    const password = generatePassword();
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const newUser = await appUserService.create({
      username: username.trim(),
      full_name: fullName?.trim() || null,
      email: email?.trim().toLowerCase() || null,
      password_hash,
      phone: phone.trim(),
      company_name: companyName?.trim() || null,
      office_address: officeAddress?.trim() || null,
      business_type_id: resolvedBtId,
      is_verified: 1,
    });

    // If partner switch is on, create an approved partner record
    if (isApprovedPartner) {
      // Look up the "Approved" status ID
      const statusResult = await d1.query<{ id: number }>(
        "SELECT id FROM partner_status_type WHERE status_name = 'Approved' LIMIT 1",
        [],
      );
      const approvedStatusId = statusResult.results[0]?.id;

      if (approvedStatusId) {
        await partnerService.create({
          app_user_id: newUser.app_user_id,
          partner_type_id: null,
          status_id: approvedStatusId,
          reviewed_at: new Date().toISOString(),
          reviewed_by: actorId,
        });
      }
    }

    invalidateTag(CACHE_TAGS.USERS);
    return { success: true, password };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create user"),
    };
  }
}
