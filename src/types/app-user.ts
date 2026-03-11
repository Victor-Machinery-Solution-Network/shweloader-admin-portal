export interface AppUser {
  app_user_id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  password_hash: string;
  phone: string;
  is_verified: number;
  company_name: string | null;
  office_address: string | null;
  business_type_id: number | null;
  /** Computed from partner JOIN — not a real DB column, read-only */
  is_approved_partner: number;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

export interface BusinessType {
  business_type_id: number;
  name: string;
  is_listed: number;
  created_by: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}
