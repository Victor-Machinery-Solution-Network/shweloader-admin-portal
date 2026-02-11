/**
 * Shared TypeScript types and interfaces
 */

// Re-export D1 types for convenience
export type {
  D1Response,
  D1ErrorResponse,
  D1ApiResponse,
  D1Meta,
  D1QueryParams,
  D1RawQueryRequest,
  D1CreatePayload,
  D1UpdatePayload,
  WithId,
} from "./d1";

// Re-export equipment types
export type { EquipmentMainCategory, EquipmentSubCategory } from "./equipment";

// Re-export attachment types
export type { AttachmentCategory } from "./attachment";

// Re-export location types
export type { Location } from "./location";

// Re-export customer types
export type { Customer, BusinessType } from "./customer";

// Re-export partner types
export type {
  Partner,
  PartnerType,
  PartnerStatusType,
  PartnerWithDetails,
} from "./partner";

// Re-export brand types
export type {
  ProductBrand,
  AttachmentCategoryBrand,
  EquipmentSubCategoryBrand,
  ProductBrandWithCategories,
} from "./brand";

/** Matches the admin_user table in D1 */
export interface AdminUser {
  user_id: number;
  username: string;
  email: string;
  password_hash: string;
  role_id: number | null;
  active: number;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
