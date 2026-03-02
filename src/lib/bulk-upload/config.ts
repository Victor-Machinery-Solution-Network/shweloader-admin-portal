import { CACHE_TAGS } from "@/lib/constants";
import type { BulkUploadConfig } from "@/types/bulk-upload";

export const BULK_UPLOAD_CONFIGS: Record<string, BulkUploadConfig> = {
  brands: {
    entityKey: "brands",
    displayName: "Brand",
    displayNamePlural: "Brands",
    returnRoute: "/brands",
    maxRows: 100,
    columns: [
      {
        header: "Brand Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique brand name. Duplicates will be rejected.",
      },
      {
        header: "Attachment Categories",
        field: "categoryIds",
        type: "multi-select",
        required: false,
        lookupKey: "attachmentCategories",
        excelWidth: 40,
        helpText:
          "Comma-separated category names (e.g., 'Buckets, Hammers'). Must match valid values exactly.",
      },
      {
        header: "Equipment Sub-Categories",
        field: "subCategoryIds",
        type: "multi-select",
        required: false,
        lookupKey: "equipmentSubCategories",
        excelWidth: 40,
        helpText:
          "Comma-separated sub-category names. Must match valid values exactly.",
      },
    ],
    lookupKeys: ["attachmentCategories", "equipmentSubCategories"],
    cacheTags: [CACHE_TAGS.BRANDS],
    instructions:
      "Enter one brand per row. Category associations are optional. Brand names must be unique.",
  },

  "equipment-models": {
    entityKey: "equipment-models",
    displayName: "Equipment Model",
    displayNamePlural: "Equipment Models",
    returnRoute: "/equipment/models",
    maxRows: 100,
    columns: [
      {
        header: "Model Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique model name.",
      },
      {
        header: "Sub Category",
        field: "sub_category_id",
        type: "select",
        required: true,
        lookupKey: "equipmentSubCategories",
        excelWidth: 25,
        helpText: "Must match an existing sub-category name exactly.",
      },
      {
        header: "Brand",
        field: "brand_id",
        type: "select",
        required: false,
        lookupKey: "brands",
        excelWidth: 20,
        helpText: "Must match an existing brand name exactly.",
        dependsOn: {
          parentField: "sub_category_id",
          associationKey: "brandsByEquipmentSubCategory",
        },
      },
    ],
    imageFields: [
      {
        label: "PDF Spec Sheet",
        field: "pdf_url",
        r2Path: "pdfs/equipments/",
        isPrimary: true,
        maxPerRow: 1,
      },
    ],
    lookupKeys: ["brands", "equipmentSubCategories"],
    cacheTags: [CACHE_TAGS.EQUIPMENT_MODELS],
    instructions:
      "Enter one equipment model per row. Sub-category is required. Brand is optional.",
  },

  listings: {
    entityKey: "listings",
    displayName: "Listing",
    displayNamePlural: "Listings",
    returnRoute: "/listings/for-sale",
    maxRows: 100,
    columns: [
      {
        header: "Product Type",
        field: "product_type",
        type: "select",
        required: true,
        options: [
          { label: "Equipment", value: "equipment" },
          { label: "Attachment", value: "attachment" },
        ],
        excelWidth: 15,
        helpText: "Equipment or Attachment.",
      },
      {
        header: "Model Name",
        field: "model_name",
        type: "select",
        required: true,
        lookupKey: "allModels",
        excelWidth: 30,
        helpText:
          "Exact model name. Equipment models prefixed with [EQ], attachments with [AT].",
      },
      {
        header: "Partner",
        field: "partner_id",
        type: "select",
        required: true,
        lookupKey: "approvedPartners",
        excelWidth: 25,
        helpText: "Must be an approved partner name.",
      },
      {
        header: "Listing Type",
        field: "listing_type",
        type: "select",
        required: true,
        options: [
          { label: "For Sale", value: "sale" },
          { label: "For Rent", value: "rent" },
          { label: "Both", value: "both" },
        ],
        excelWidth: 15,
        helpText: "For Sale, For Rent, or Both.",
      },
      {
        header: "Condition",
        field: "condition_type",
        type: "select",
        required: false,
        lookupKey: "conditionTypes",
        excelWidth: 15,
        helpText: "Only for sale listings.",
      },
      {
        header: "MMK Price",
        field: "mmk_price",
        type: "number",
        required: false,
        excelWidth: 15,
      },
      {
        header: "USD Price",
        field: "usd_price",
        type: "number",
        required: false,
        excelWidth: 15,
      },
      {
        header: "Township",
        field: "township",
        type: "select",
        required: false,
        lookupKey: "townships",
        excelWidth: 20,
      },
      {
        header: "Description",
        field: "description",
        type: "text",
        required: false,
        maxLength: 2000,
        excelWidth: 40,
      },
      {
        header: "Hide Price",
        field: "hide_price",
        type: "boolean",
        required: false,
        excelWidth: 12,
        helpText: "Yes or No.",
      },
      {
        header: "Hide Display",
        field: "is_hidden",
        type: "boolean",
        required: false,
        excelWidth: 12,
        helpText: "Yes or No.",
      },
    ],
    imageFields: [
      {
        label: "Thumbnail",
        field: "thumbnail_url",
        r2Path: "products/thumbnails/",
        isPrimary: true,
        maxPerRow: 1,
      },
      {
        label: "Product Photos",
        field: "product_images",
        r2Path: "products/photos/",
        maxPerRow: 10,
      },
    ],
    lookupKeys: ["allModels", "approvedPartners", "conditionTypes", "townships"],
    cacheTags: [CACHE_TAGS.SALE_LISTINGS, CACHE_TAGS.RENT_LISTINGS],
    instructions:
      "Enter one listing per row. Each listing must have a product type, model, partner, and listing type.",
  },

  // ── Tier B: Simple text-only entities ────────────────────────────────────

  "article-categories": {
    entityKey: "article-categories",
    displayName: "Article Category",
    displayNamePlural: "Article Categories",
    returnRoute: "/articles/categories",
    maxRows: 100,
    columns: [
      {
        header: "Category Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique category name. Duplicates will be rejected.",
      },
    ],
    lookupKeys: [],
    cacheTags: [CACHE_TAGS.ARTICLE_CATEGORIES],
    instructions: "Enter one article category per row. Names must be unique.",
  },

  "business-types": {
    entityKey: "business-types",
    displayName: "Business Type",
    displayNamePlural: "Business Types",
    returnRoute: "/business-types",
    maxRows: 100,
    columns: [
      {
        header: "Business Type Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique business type name. Duplicates will be rejected.",
      },
    ],
    lookupKeys: [],
    cacheTags: [CACHE_TAGS.BUSINESS_TYPES],
    instructions: "Enter one business type per row. Names must be unique.",
  },

  announcements: {
    entityKey: "announcements",
    displayName: "Announcement",
    displayNamePlural: "Announcements",
    returnRoute: "/announcement-bar",
    maxRows: 100,
    columns: [
      {
        header: "Announcement Text",
        field: "text",
        type: "text",
        required: true,
        maxLength: 500,
        excelWidth: 50,
        helpText: "The announcement message to display.",
      },
    ],
    lookupKeys: [],
    cacheTags: [CACHE_TAGS.ANNOUNCEMENTS],
    instructions:
      "Enter one announcement per row. New announcements are added at the end of the list and active by default.",
  },

  // ── Tier C: Text + select dropdown entities ──────────────────────────────

  "state-regions": {
    entityKey: "state-regions",
    displayName: "State/Region",
    displayNamePlural: "States & Regions",
    returnRoute: "/locations",
    maxRows: 100,
    columns: [
      {
        header: "Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique state/region name.",
      },
      {
        header: "Type",
        field: "type",
        type: "select",
        required: true,
        options: [
          { label: "State", value: "state" },
          { label: "Region", value: "region" },
          { label: "Union Territory", value: "union_territory" },
        ],
        excelWidth: 20,
        helpText: "State, Region, or Union Territory.",
      },
    ],
    lookupKeys: [],
    cacheTags: [CACHE_TAGS.LOCATIONS],
    instructions: "Enter one state or region per row. Names must be unique.",
  },

  districts: {
    entityKey: "districts",
    displayName: "District",
    displayNamePlural: "Districts",
    returnRoute: "/locations",
    maxRows: 100,
    columns: [
      {
        header: "State/Region",
        field: "state_region_id",
        type: "select",
        required: true,
        lookupKey: "stateRegions",
        excelWidth: 30,
        helpText: "Must match an existing state/region name exactly.",
      },
      {
        header: "District Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique district name within the state/region.",
      },
    ],
    lookupKeys: ["stateRegions"],
    cacheTags: [CACHE_TAGS.LOCATIONS],
    instructions:
      "Enter one district per row. Select the state/region from the dropdown.",
  },

  locations: {
    entityKey: "locations",
    displayName: "Township",
    displayNamePlural: "Townships",
    returnRoute: "/locations",
    maxRows: 100,
    columns: [
      {
        header: "District",
        field: "district_id",
        type: "select",
        required: true,
        lookupKey: "districts",
        excelWidth: 35,
        helpText:
          "District name with state/region in parentheses. Must match exactly.",
      },
      {
        header: "Township Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique township name within the district.",
      },
    ],
    lookupKeys: ["districts"],
    cacheTags: [CACHE_TAGS.LOCATIONS],
    instructions:
      "Enter one township per row. Select the district from the dropdown.",
  },

  "equipment-main-categories": {
    entityKey: "equipment-main-categories",
    displayName: "Equipment Main Category",
    displayNamePlural: "Equipment Main Categories",
    returnRoute: "/equipment/main-categories",
    maxRows: 100,
    columns: [
      {
        header: "Category Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique category name. Duplicates will be rejected.",
      },
    ],
    imageFields: [
      {
        label: "Category Icon",
        field: "image_url",
        r2Path: "categories/equipment/",
        isPrimary: true,
        maxPerRow: 1,
      },
    ],
    lookupKeys: [],
    cacheTags: [CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES],
    instructions:
      "Enter one equipment main category per row. Images can be matched after upload.",
  },

  "equipment-sub-categories": {
    entityKey: "equipment-sub-categories",
    displayName: "Equipment Sub Category",
    displayNamePlural: "Equipment Sub Categories",
    returnRoute: "/equipment/sub-categories",
    maxRows: 100,
    columns: [
      {
        header: "Main Category",
        field: "category_id",
        type: "select",
        required: true,
        lookupKey: "equipmentMainCategories",
        excelWidth: 25,
        helpText: "Must match an existing main category name exactly.",
      },
      {
        header: "Sub Category Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique sub-category name. Duplicates will be rejected.",
      },
    ],
    imageFields: [
      {
        label: "Category Icon",
        field: "image_url",
        r2Path: "categories/equipment-sub/",
        isPrimary: true,
        maxPerRow: 1,
      },
    ],
    lookupKeys: ["equipmentMainCategories"],
    cacheTags: [CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES],
    instructions:
      "Enter one equipment sub-category per row. Main category is required.",
  },

  "attachment-categories": {
    entityKey: "attachment-categories",
    displayName: "Attachment Category",
    displayNamePlural: "Attachment Categories",
    returnRoute: "/attachments/categories",
    maxRows: 100,
    columns: [
      {
        header: "Category Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique category name. Duplicates will be rejected.",
      },
    ],
    imageFields: [
      {
        label: "Category Icon",
        field: "image_url",
        r2Path: "categories/attachments/",
        isPrimary: true,
        maxPerRow: 1,
      },
    ],
    lookupKeys: [],
    cacheTags: [CACHE_TAGS.ATTACHMENT_CATEGORIES],
    instructions:
      "Enter one attachment category per row. Images can be matched after upload.",
  },

  "attachment-models": {
    entityKey: "attachment-models",
    displayName: "Attachment Model",
    displayNamePlural: "Attachment Models",
    returnRoute: "/attachments/models",
    maxRows: 100,
    columns: [
      {
        header: "Category",
        field: "category_id",
        type: "select",
        required: true,
        lookupKey: "attachmentCategories",
        excelWidth: 25,
        helpText: "Must match an existing attachment category name exactly.",
      },
      {
        header: "Brand",
        field: "brand_id",
        type: "select",
        required: false,
        lookupKey: "brands",
        excelWidth: 20,
        helpText: "Must match an existing brand name exactly.",
        dependsOn: {
          parentField: "category_id",
          associationKey: "brandsByAttachmentCategory",
        },
      },
      {
        header: "Model Name",
        field: "name",
        type: "text",
        required: true,
        maxLength: 100,
        excelWidth: 30,
        helpText: "Unique model name. Duplicates will be rejected.",
      },
    ],
    lookupKeys: ["attachmentCategories", "brands"],
    cacheTags: [CACHE_TAGS.ATTACHMENT_MODELS],
    instructions:
      "Enter one attachment model per row. Category is required. Brand is optional.",
  },
};

export function getBulkUploadConfig(
  entityKey: string,
): BulkUploadConfig {
  const config = BULK_UPLOAD_CONFIGS[entityKey];
  if (!config) throw new Error(`Unknown bulk upload entity: ${entityKey}`);
  return config;
}
