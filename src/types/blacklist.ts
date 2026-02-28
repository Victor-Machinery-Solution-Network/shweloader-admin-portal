export interface BlacklistEntry {
  blacklist_id: number;
  app_user_id: number;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  reason: string;
  blacklisted_by: number;
  created_at: string;
}

export interface BlacklistEntryWithDetails extends BlacklistEntry {
  username: string;
  admin_username: string;
}

export interface BlacklistImpactPreview {
  affected_users: Array<{
    app_user_id: number;
    username: string;
    email: string;
    phone: string | null;
    company_name: string | null;
  }>;
  listing_count: number;
  sale_listing_count: number;
  rent_listing_count: number;
  enquiry_count: number;
  partner_count: number;
  is_company_ban: boolean;
}
