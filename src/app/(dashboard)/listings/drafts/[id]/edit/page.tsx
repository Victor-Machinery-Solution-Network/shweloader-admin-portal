import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SYSTEM_EXCHANGE_RATE } from "@/lib/constants";
import { SETTING_KEYS } from "@/types/setting";
import {
  getApprovedPartners,
  getEquipmentModels,
  getAttachmentModels,
  getBrands,
  getMainCategories,
  getSubCategories,
  getSubCategoryBrandLinks,
  getAttachmentCategories,
  getCategoryBrandLinks,
  getCategorySubCategoryLinks,
  getStateRegions,
  getDistricts,
  getTownships,
  getConditionTypes,
  getSettings,
  getCustomFieldTemplates,
} from "@/lib/cache";
import { getDraftById, getProductImages } from "@/lib/actions/listing";
import { ListingEditor } from "@/components/features/listings/shared/listing-editor";
import { EditorSkeleton } from "@/components/features/listings/shared/editor-skeleton";
import { EditorHtmlLock } from "@/components/features/listings/shared/editor-html-lock";
import { PermissionGate } from "@/components/shared/permission-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/lib/auth";
import { getCachedPermissionsForRole } from "@/lib/cache";

export const metadata = {
  title: "Edit Draft",
  description: "Edit a draft listing",
};

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function EditDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PermissionGate feature={["sale_listings", "rent_listings"]} permission="create">
        <EditDraftContent params={params} />
      </PermissionGate>
    </Suspense>
  );
}

async function EditDraftContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    draft,
    partners,
    equipmentModels,
    attachmentModels,
    brands,
    mainCategories,
    subCategories,
    subCategoryBrandLinks,
    attachmentCategories,
    categoryBrandLinks,
    categorySubCategoryLinks,
    stateRegions,
    districts,
    townships,
    conditionTypes,
    settings,
    templates,
  ] = await Promise.all([
    getDraftById(Number(id)),
    getApprovedPartners(),
    getEquipmentModels(),
    getAttachmentModels(),
    getBrands(),
    getMainCategories(),
    getSubCategories(),
    getSubCategoryBrandLinks(),
    getAttachmentCategories(),
    getCategoryBrandLinks(),
    getCategorySubCategoryLinks(),
    getStateRegions(),
    getDistricts(),
    getTownships(),
    getConditionTypes(),
    getSettings(),
    getCustomFieldTemplates(),
  ]);

  // getDraftById already hides other admins' drafts from roles without
  // listing_drafts:read. This second gate is for the read-but-not-edit case —
  // better a clear message than an editor whose Save always fails.
  if (!draft) notFound();

  if (!draft.is_own) {
    const session = await auth();
    const perms = session?.user?.role_id
      ? await getCachedPermissionsForRole(session.user.role_id)
      : [];
    if (!perms.includes("listing_drafts:edit")) {
      return (
        <EmptyState
          icon={ShieldAlert}
          title="Read-only draft"
          description={`This draft belongs to ${draft.created_by_name ?? "another admin"}. You need the "Listing Drafts — edit" permission to change it.`}
        />
      );
    }
  }

  const images = await getProductImages(draft.id);

  const exchangeRate =
    Number(settings[SETTING_KEYS.EXCHANGE_RATE]) || SYSTEM_EXCHANGE_RATE;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <EditorHtmlLock />
      <ListingEditor
        pageType="sale"
        draft={draft}
        existingImages={images}
        partners={partners}
        equipmentModels={equipmentModels}
        attachmentModels={attachmentModels}
        brands={brands}
        mainCategories={mainCategories}
        subCategories={subCategories}
        subCategoryBrandLinks={subCategoryBrandLinks}
        attachmentCategories={attachmentCategories}
        categoryBrandLinks={categoryBrandLinks}
        attachmentCategorySubCategoryLinks={categorySubCategoryLinks}
        stateRegions={stateRegions}
        districts={districts}
        townships={townships}
        conditionTypes={conditionTypes}
        exchangeRate={exchangeRate}
        templates={templates}
      />
    </div>
  );
}
