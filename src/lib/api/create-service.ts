/**
 * Service Factory for D1 REST API
 *
 * Creates type-safe CRUD services for database tables.
 *
 * @example
 * // Define your entity type
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 *   created_at: string;
 * }
 *
 * // Create a service
 * const userService = createService<User>('users');
 *
 * // Use the service
 * const users = await userService.list({ limit: 10 });
 * const user = await userService.getById(123);
 * const newUser = await userService.create({ name: 'John', email: 'john@example.com' });
 * const updated = await userService.update(123, { name: 'Jane' });
 * await userService.delete(123);
 */

import { d1, D1Error } from "./d1-client";
import type { D1QueryParams, D1Response } from "@/types/d1";

/** Create payload - accepts partial of T without id/timestamps */
type CreateData<T> = Omit<Partial<T>, "id" | "created_at" | "updated_at">;

/** Update payload - same as create, all fields optional */
type UpdateData<T> = CreateData<T>;

export { D1Error };

export interface ServiceOptions {
  /** Default query parameters applied to all list requests */
  defaultParams?: D1QueryParams;
  /** Primary key column name (defaults to 'id'). Used for getById, update, delete. */
  primaryKey?: string;
}

export interface Service<T> {
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
  create(data: CreateData<T>): Promise<T>;

  /** Update an existing record */
  update(id: string | number, data: UpdateData<T>): Promise<T>;

  /** Delete a record */
  delete(id: string | number): Promise<void>;

  /** Check if a record exists */
  exists(id: string | number): Promise<boolean>;

  /** Count records matching optional filters */
  count(filters?: Record<string, string | number>): Promise<number>;
}

/**
 * Create a type-safe CRUD service for a database table
 *
 * @param table - The database table name
 * @param options - Optional service configuration
 */
export function createService<T>(
  table: string,
  options: ServiceOptions = {},
): Service<T> {
  const { defaultParams = {}, primaryKey = "id" } = options;
  const usesCustomPK = primaryKey !== "id";

  return {
    table,

    async list(params?: D1QueryParams): Promise<T[]> {
      const mergedParams = { ...defaultParams, ...params };
      const response = await d1.list<T>(table, mergedParams);
      return response.results;
    },

    async listWithMeta(params?: D1QueryParams): Promise<D1Response<T>> {
      const mergedParams = { ...defaultParams, ...params };
      return d1.list<T>(table, mergedParams);
    },

    async getById(id: string | number): Promise<T | null> {
      try {
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

    async create(data: CreateData<T>): Promise<T> {
      const response = await d1.create<T>(
        table,
        data as Record<string, unknown>,
      );
      return response.results[0];
    },

    async update(id: string | number, data: UpdateData<T>): Promise<T> {
      if (usesCustomPK) {
        const entries = Object.entries(data as Record<string, unknown>).filter(
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
      const response = await d1.update<T>(
        table,
        id,
        data as Record<string, unknown>,
      );
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
      // Use raw query for count
      let sql = `SELECT COUNT(*) as count FROM ${table}`;
      const params: (string | number)[] = [];

      if (filters && Object.keys(filters).length > 0) {
        const conditions = Object.entries(filters).map(([key, value]) => {
          params.push(value);
          return `${key} = ?`;
        });
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      const response = await d1.query<{ count: number }>(sql, params);
      return response.results[0]?.count ?? 0;
    },
  };
}
