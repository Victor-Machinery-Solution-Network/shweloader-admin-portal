export interface AppUser {
  app_user_id: number;
  username: string;
  email: string;
  password_hash: string;
  phone: string | null;
  is_verified: number;
  company_name: string | null;
  office_address: string | null;
  business_type_id: number | null;
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
