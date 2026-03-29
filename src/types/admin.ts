/** Matches the admin_user table in D1 */
export interface AdminUser {
  user_id: number;
  username: string;
  email: string;
  password_hash: string;
  role_id: number | null;
  active: number;
  avatar_url: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Admin with role name joined from role table */
export interface AdminWithRole extends Omit<AdminUser, "password_hash"> {
  role_name: string | null;
}
