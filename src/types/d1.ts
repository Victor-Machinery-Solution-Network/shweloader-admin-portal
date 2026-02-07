/**
 * Cloudflare D1 REST API types
 * Based on: cloudflare-d1-rest-api.shweloader.workers.dev
 */

/** D1 API response metadata */
export interface D1Meta {
  served_by: string;
  served_by_region: string;
  served_by_primary: boolean;
  timings: {
    sql_duration_ms: number;
  };
  duration: number;
  changes: number;
  last_row_id: number;
  changed_db: boolean;
  size_after: number;
  rows_read: number;
  rows_written: number;
}

/** Successful D1 API response */
export interface D1Response<T> {
  success: true;
  meta: D1Meta;
  results: T[];
}

/** Error D1 API response */
export interface D1ErrorResponse {
  success: false;
  error: string;
}

/** Union type for all D1 responses */
export type D1ApiResponse<T> = D1Response<T> | D1ErrorResponse;

/** Query parameters for D1 REST API */
export interface D1QueryParams {
  /** Column to sort by */
  sort_by?: string;
  /** Sort order */
  order?: 'asc' | 'desc';
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
  /** Additional filter parameters (column=value) */
  [key: string]: string | number | undefined;
}

/** Raw SQL query request */
export interface D1RawQueryRequest {
  query: string;
  params?: (string | number | boolean | null)[];
}

/** Type helper for record with ID */
export type WithId<T> = T & { id: number | string };

/** Create/Update payload (omit id and timestamps) */
export type D1CreatePayload<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type D1UpdatePayload<T> = Partial<D1CreatePayload<T>>;
