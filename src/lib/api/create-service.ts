/**
 * Service Factory for D1 REST API
 *
 * Creates type-safe CRUD services for database tables.
 * Supports soft-delete: when `softDelete: true`, list/count exclude
 * soft-deleted rows and additional methods (softDelete, restore,
 * permanentDelete, listDeleted) become available.
 *
 * @example
 * // Standard service
 * const userService = createService<User>('users');
 *
 * // Soft-delete enabled service
 * const brandService = createService<ProductBrand, 'brand_id'>('product_brand', {
 *   primaryKey: 'brand_id',
 *   softDelete: true,
 * });
 * await brandService.softDelete(1, adminUserId);
 * await brandService.restore(1);
 */

import { d1, D1Error } from "./d1-client";
import type { D1QueryParams, D1Response } from "@/types/d1";

/** Fields auto-managed by the database — always stripped from create/update payloads */
type AutoFields = "created_at" | "updated_at";

/** Create payload - strips PK + auto-managed timestamp fields */
type CreateData<T, K extends keyof T = "id" & keyof T> = Omit<
  Partial<T>,
  K | AutoFields
>;

/** Update payload - same shape as create */
type UpdateData<T, K extends keyof T = "id" & keyof T> = CreateData<T, K>;

export { D1Error };

export interface ServiceOptions {
  /** Default query parameters applied to all list requests */
  defaultParams?: D1QueryParams;
  /** Primary key column name (defaults to 'id'). Used for getById, update, delete. */
  primaryKey?: string;
  /** Enable soft-delete. When true, list/count exclude soft-deleted rows. */
  softDelete?: boolean;
}

export interface Service<T, K extends keyof T = "id" & keyof T> {
  /** Table name */
  readonly table: string;

  /** List records with optional filtering, sorting, and pagination */
  list(params?: D1QueryParams): Promise<T[]>;

  /** List records and return full D1 response with metadata */
  listWithMeta(params?: D1QueryParams): Promise<D1Response<T>>;

  /** Get a single record by ID */
  getById(id: string | number): Promise<T | null>;

  /** Get a single record by ID, throws if not found */
  getByIdOrThrow(id: string | number): Promise<T>;

  /** Create a new record */
  create(data: CreateData<T, K>): Promise<T>;

  /** Update an existing record */
  update(id: string | number, data: UpdateData<T, K>): Promise<T>;

  /** Delete a record (hard delete) */
  delete(id: string | number): Promise<void>;

  /** Check if a record exists */
  exists(id: string | number): Promise<boolean>;

  /** Count records matching optional filters */
  count(filters?: Record<string, string | number>): Promise<number>;
}

/** Extended service with soft-delete methods */
export interface SoftDeleteService<T, K extends keyof T = "id" & keyof T>
  extends Service<T, K> {
  /** Soft-delete: sets deleted_at + deleted_by */
  softDelete(id: string | number, deletedBy: number): Promise<T>;

  /** Restore a soft-deleted record */
  restore(id: string | number): Promise<T>;

  /** Permanently delete (actual DELETE FROM) — use from trash purge only */
  permanentDelete(id: string | number): Promise<void>;

  /** List only soft-deleted records (for trash page) */
  listDeleted(params?: {
    limit?: number;
    offset?: number;
  }): Promise<T[]>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const RESERVED_PARAM_KEYS = new Set(["sort_by", "order", "limit", "offset"]);

/**
 * Convert D1QueryParams into a raw SQL SELECT with optional extra WHERE conditions.
 * Used when the REST GET endpoint can't express the needed filters (e.g. IS NULL).
 */
function buildSelectSql(
  table: string,
  params: D1QueryParams,
  extraConditions: string[] = [],
): { sql: string; values: (string | number)[] } {
  const conditions = [...extraConditions];
  const values: (string | number)[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (
      RESERVED_PARAM_KEYS.has(key) ||
      value === undefined ||
      value === null ||
      value === ""
    )
      continue;
    conditions.push(`${key} = ?`);
    values.push(value as string | number);
  }

  let sql = `SELECT * FROM ${table}`;
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  if (params.sort_by) {
    // Defense-in-depth: `sort_by` is interpolated into SQL, so even though
    // every current caller passes a hardcoded column name, validate against
    // a safe-identifier pattern in case a future caller forgets and passes
    // user input. SQLite identifiers: letter/underscore start + alnum/_.
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(params.sort_by)) {
      throw new Error(`Invalid sort_by column name: ${params.sort_by}`);
    }
    sql += ` ORDER BY ${params.sort_by} ${params.order === "desc" ? "DESC" : "ASC"}`;
  }

  if (params.limit !== undefined) {
    sql += ` LIMIT ?`;
    values.push(params.limit);
  }
  if (params.offset !== undefined) {
    sql += ` OFFSET ?`;
    values.push(params.offset);
  }

  return { sql, values };
}

// ── Overloads ────────────────────────────────────────────────────────────────

/** When softDelete is true, returns SoftDeleteService with extra methods */
export function createService<T, K extends keyof T = "id" & keyof T>(
  table: string,
  options: ServiceOptions & { softDelete: true },
): SoftDeleteService<T, K>;

/** Standard service (no soft-delete) */
export function createService<T, K extends keyof T = "id" & keyof T>(
  table: string,
  options?: ServiceOptions,
): Service<T, K>;

/**
 * Create a type-safe CRUD service for a database table
 */
export function createService<T, K extends keyof T = "id" & keyof T>(
  table: string,
  options: ServiceOptions = {},
): Service<T, K> | SoftDeleteService<T, K> {
  const { defaultParams = {}, primaryKey = "id", softDelete = false } = options;
  const usesCustomPK = primaryKey !== "id";

  // ── Base list (shared logic) ───────────────────────────────────────────

  async function listImpl(params?: D1QueryParams): Promise<D1Response<T>> {
    const mergedParams = { ...defaultParams, ...params };

    if (softDelete) {
      // Must use raw SQL because REST GET can't express `deleted_at IS NULL`
      const { sql, values } = buildSelectSql(table, mergedParams, [
        "deleted_at IS NULL",
      ]);
      return d1.query<T>(sql, values);
    }

    return d1.list<T>(table, mergedParams);
  }

  // ── Base service ───────────────────────────────────────────────────────

  const base: Service<T, K> = {
    table,

    async list(params?: D1QueryParams): Promise<T[]> {
      const response = await listImpl(params);
      return response.results;
    },

    async listWithMeta(params?: D1QueryParams): Promise<D1Response<T>> {
      return listImpl(params);
    },

    async getById(id: string | number): Promise<T | null> {
      try {
        // getById does NOT filter by deleted_at — needed for trash detail views
        if (usesCustomPK) {
          const response = await d1.query<T>(
            `SELECT * FROM ${table} WHERE ${primaryKey} = ? LIMIT 1`,
            [id],
          );
          return response.results[0] ?? null;
        }
        const response = await d1.get<T>(table, id);
        return response.results[0] ?? null;
      } catch (error) {
        if (error instanceof D1Error && error.status === 404) {
          return null;
        }
        throw error;
      }
    },

    async getByIdOrThrow(id: string | number): Promise<T> {
      const record = await this.getById(id);
      if (!record) {
        throw new D1Error(`${table} with id ${id} not found`, 404);
      }
      return record;
    },

    async create(data: CreateData<T, K>): Promise<T> {
      const response = await d1.create<T>(
        table,
        data as Record<string, unknown>,
      );
      return response.results[0];
    },

    async update(id: string | number, data: UpdateData<T, K>): Promise<T> {
      const payload = {
        ...(data as Record<string, unknown>),
        updated_at: new Date().toISOString(),
      };

      if (usesCustomPK) {
        const entries = Object.entries(payload).filter(
          ([, v]) => v !== undefined,
        );
        const setClauses = entries.map(([key]) => `${key} = ?`).join(", ");
        const values = entries.map(([, v]) => v as string | number);
        values.push(id as string | number);
        const response = await d1.query<T>(
          `UPDATE ${table} SET ${setClauses} WHERE ${primaryKey} = ? RETURNING *`,
          values,
        );
        return response.results[0];
      }
      const response = await d1.update<T>(table, id, payload);
      return response.results[0];
    },

    async delete(id: string | number): Promise<void> {
      if (usesCustomPK) {
        await d1.query(`DELETE FROM ${table} WHERE ${primaryKey} = ?`, [id]);
        return;
      }
      await d1.delete(table, id);
    },

    async exists(id: string | number): Promise<boolean> {
      const record = await this.getById(id);
      return record !== null;
    },

    async count(filters?: Record<string, string | number>): Promise<number> {
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      // Exclude soft-deleted rows from counts
      if (softDelete) {
        conditions.push("deleted_at IS NULL");
      }

      if (filters && Object.keys(filters).length > 0) {
        for (const [key, value] of Object.entries(filters)) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }

      let sql = `SELECT COUNT(*) as count FROM ${table}`;
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      const response = await d1.query<{ count: number }>(sql, params);
      return response.results[0]?.count ?? 0;
    },
  };

  // ── Soft-delete extensions ─────────────────────────────────────────────

  if (!softDelete) {
    return base;
  }

  const softDeleteMethods: Pick<
    SoftDeleteService<T, K>,
    "softDelete" | "restore" | "permanentDelete" | "listDeleted"
  > = {
    async softDelete(id: string | number, deletedBy: number): Promise<T> {
      const now = new Date().toISOString();
      const response = await d1.query<T>(
        `UPDATE ${table} SET deleted_at = ?, deleted_by = ? WHERE ${primaryKey} = ? RETURNING *`,
        [now, deletedBy, id],
      );
      if (!response.results[0]) {
        throw new D1Error(`${table} with id ${id} not found`, 404);
      }
      return response.results[0];
    },

    async restore(id: string | number): Promise<T> {
      const response = await d1.query<T>(
        `UPDATE ${table} SET deleted_at = NULL, deleted_by = NULL WHERE ${primaryKey} = ? RETURNING *`,
        [id],
      );
      if (!response.results[0]) {
        throw new D1Error(`${table} with id ${id} not found`, 404);
      }
      return response.results[0];
    },

    async permanentDelete(id: string | number): Promise<void> {
      // Actual hard DELETE — only called from trash purge
      return base.delete(id);
    },

    async listDeleted(params?: {
      limit?: number;
      offset?: number;
    }): Promise<T[]> {
      let sql = `SELECT * FROM ${table} WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`;
      const values: number[] = [];

      if (params?.limit !== undefined) {
        sql += ` LIMIT ?`;
        values.push(params.limit);
      }
      if (params?.offset !== undefined) {
        sql += ` OFFSET ?`;
        values.push(params.offset);
      }

      const response = await d1.query<T>(sql, values);
      return response.results;
    },
  };

  return { ...base, ...softDeleteMethods };
}
