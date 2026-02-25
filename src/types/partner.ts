export interface Partner {
  id: number;
  app_user_id: number | null;
  partner_type_id: number | null;
  status_id: number | null;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
  rejection_reason: string | null;
  updated_at: string;
}

export interface PartnerType {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerStatusType {
  id: number;
  status_name: string;
}

/** Partner row joined with user + lookup names for display */
export interface PartnerWithDetails extends Partner {
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_company: string | null;
  user_address: string | null;
  user_verified: number | null;
  user_joined: string | null;
  business_type_name: string | null;
  partner_type_name: string | null;
  status_name: string | null;
}
