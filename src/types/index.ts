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
} from './d1';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
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
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
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
