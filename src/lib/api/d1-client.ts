/**
 * Cloudflare D1 REST API Client
 *
 * Connects to: cloudflare-d1-rest-api.shweloader.workers.dev
 *
 * @example
 * // List records with filtering
 * const { results } = await d1.list('users', { limit: 10, status: 'active' });
 *
 * // Get single record
 * const { results: [user] } = await d1.get('users', 123);
 *
 * // Create record
 * const { results: [newUser] } = await d1.create('users', { name: 'John', email: 'john@example.com' });
 *
 * // Update record
 * const { results: [updated] } = await d1.update('users', 123, { name: 'Jane' });
 *
 * // Delete record
 * await d1.delete('users', 123);
 *
 * // Raw SQL query
 * const { results } = await d1.query('SELECT * FROM users WHERE age > ? LIMIT ?', [21, 10]);
 */

import type {
  D1ApiResponse,
  D1Response,
  D1QueryParams,
  D1RawQueryRequest,
} from "@/types/d1";

// Configuration
const D1_BASE_URL =
  process.env.NEXT_PUBLIC_D1_API_URL ||
  "https://cloudflare-d1-rest-api.shweloader.workers.dev";

const D1_API_TOKEN = process.env.D1_API_TOKEN || "";

/** Custom error class for D1 API errors */
export class D1Error extends Error {
  constructor(
    message: string,
    public status: number,
    public isD1Error: boolean = true,
  ) {
    super(message);
    this.name = "D1Error";
  }
}

/** Build query string from params object */
function buildQueryString(params?: D1QueryParams): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

/** Get authorization headers */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (D1_API_TOKEN) {
    headers["Authorization"] = `Bearer ${D1_API_TOKEN}`;
  }

  return headers;
}

/** Handle D1 API response */
async function handleD1Response<T>(response: Response): Promise<D1Response<T>> {
  const text = await response.text();

  // Empty response (e.g. DELETE 204) — return success with no results
  if (!text.trim()) {
    return { success: true, results: [], meta: {} } as unknown as D1Response<T>;
  }

  const data = JSON.parse(text);

  // Standard D1 format: { success, results, meta }
  if (data.success !== undefined) {
    if (!data.success) {
      throw new D1Error(data.error, response.status);
    }
    return data as D1Response<T>;
  }

  // REST create/update format: { message, data } (returned by POST 201, etc.)
  if (data.data !== undefined) {
    return {
      success: true,
      results: [data.data as T],
      meta: {},
    } as unknown as D1Response<T>;
  }

  // Error format: { error }
  if (data.error) {
    throw new D1Error(data.error, response.status);
  }

  // Unknown format — wrap as single result
  return {
    success: true,
    results: [data as T],
    meta: {},
  } as unknown as D1Response<T>;
}

/** Make a request to the D1 API */
async function d1Fetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<D1Response<T>> {
  const url = `${D1_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok && response.status !== 200) {
      // Try to parse error response
      try {
        const errorData = await response.json();
        throw new D1Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
        );
      } catch (e) {
        if (e instanceof D1Error) throw e;
        throw new D1Error(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
        );
      }
    }

    return handleD1Response<T>(response);
  } catch (error) {
    if (error instanceof D1Error) throw error;

    // Network or other errors
    throw new D1Error(
      error instanceof Error ? error.message : "Network error",
      0,
      false,
    );
  }
}

/**
 * D1 REST API Client
 */
export const d1 = {
  /**
   * List records from a table with optional filtering, sorting, and pagination
   *
   * @param table - Table name
   * @param params - Query parameters (sort_by, order, limit, offset, and filter columns)
   *
   * @example
   * // Basic list
   * const { results } = await d1.list('users');
   *
   * // With pagination
   * const { results } = await d1.list('users', { limit: 10, offset: 20 });
   *
   * // With sorting
   * const { results } = await d1.list('users', { sort_by: 'name', order: 'asc' });
   *
   * // With filtering
   * const { results } = await d1.list('users', { status: 'active', role: 'admin' });
   */
  async list<T>(table: string, params?: D1QueryParams): Promise<D1Response<T>> {
    const queryString = buildQueryString(params);
    return d1Fetch<T>(`/rest/${table}${queryString}`);
  },

  /**
   * Get a single record by ID
   *
   * @param table - Table name
   * @param id - Record ID
   *
   * @example
   * const { results: [user] } = await d1.get('users', 123);
   */
  async get<T>(table: string, id: string | number): Promise<D1Response<T>> {
    return d1Fetch<T>(`/rest/${table}/${id}`);
  },

  /**
   * Create a new record
   *
   * @param table - Table name
   * @param data - Record data
   *
   * @example
   * const { results: [user] } = await d1.create('users', {
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   */
  async create<T>(
    table: string,
    data: Record<string, unknown>,
  ): Promise<D1Response<T>> {
    return d1Fetch<T>(`/rest/${table}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing record
   *
   * @param table - Table name
   * @param id - Record ID
   * @param data - Fields to update
   *
   * @example
   * const { results: [user] } = await d1.update('users', 123, {
   *   name: 'Jane Doe'
   * });
   */
  async update<T>(
    table: string,
    id: string | number,
    data: Record<string, unknown>,
  ): Promise<D1Response<T>> {
    return d1Fetch<T>(`/rest/${table}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a record
   *
   * @param table - Table name
   * @param id - Record ID
   *
   * @example
   * await d1.delete('users', 123);
   */
  async delete<T = unknown>(
    table: string,
    id: string | number,
  ): Promise<D1Response<T>> {
    return d1Fetch<T>(`/rest/${table}/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Execute a raw SQL query
   *
   * @param sql - SQL query with placeholders (?)
   * @param params - Query parameters
   *
   * @example
   * const { results } = await d1.query(
   *   'SELECT * FROM users WHERE age > ? AND status = ? LIMIT ?',
   *   [21, 'active', 10]
   * );
   */
  async query<T>(
    sql: string,
    params?: D1RawQueryRequest["params"],
  ): Promise<D1Response<T>> {
    const body: D1RawQueryRequest = { query: sql };
    if (params) {
      body.params = params;
    }

    return d1Fetch<T>("/query", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

export default d1;
