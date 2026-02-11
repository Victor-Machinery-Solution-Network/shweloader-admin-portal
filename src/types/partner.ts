export interface Partner {
  id: number;
  customer_id: number | null;
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

/** Partner row joined with customer + lookup names for display */
export interface PartnerWithDetails extends Partner {
  customer_name: string | null;
  customer_email: string | null;
  customer_company: string | null;
  partner_type_name: string | null;
  status_name: string | null;
}
