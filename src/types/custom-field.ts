// ─── Field Types ──────────────────────────────────────────────────────────

export const CUSTOM_FIELD_TYPES = [
  "text",
  "number",
  "dropdown",
  "boolean",
  "date",
  "url",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

/** Labels for display in the type picker */
export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  number: "Number",
  dropdown: "Dropdown",
  boolean: "Yes / No",
  date: "Date",
  url: "URL",
};

// ─── Field Definition (template storage) ─────────────────────────────────

export interface CustomFieldDefinition {
  /** Unique key for this field (kebab-case, auto-generated from label) */
  key: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  defaultValue?: string;
  /** Options for dropdown type only */
  options?: string[];
  /** Sort position (0-based index) */
  order: number;
}

// ─── Field Value (listing storage) ───────────────────────────────────────

export interface CustomFieldValue {
  key: string;
  label: string;
  type: CustomFieldType;
  /** Always stored as string; parsed by type on render */
  value: string;
}

// ─── Template entity (D1 row) ────────────────────────────────────────────

export interface CustomFieldTemplate {
  template_id: number;
  name: string;
  /** JSON string of CustomFieldDefinition[] */
  fields: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** Template with parsed fields for client use */
export interface CustomFieldTemplateWithFields
  extends Omit<CustomFieldTemplate, "fields"> {
  fields: CustomFieldDefinition[];
}
