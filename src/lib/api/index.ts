/**
 * API Client Exports
 *
 * This module provides all API-related utilities for the application.
 *
 * @example
 * // Using the D1 client directly
 * import { d1, D1Error } from '@/lib/api';
 *
 * const { results } = await d1.list('users', { limit: 10 });
 *
 * @example
 * // Using the service factory
 * import { createService } from '@/lib/api';
 *
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * const userService = createService<User>('users');
 * const users = await userService.list();
 */

// D1 REST API client
export { d1, D1Error } from './d1-client';

// Service factory
export { createService, type Service, type ServiceOptions } from './create-service';

// Re-export types
export type {
  D1Response,
  D1Meta,
  D1QueryParams,
  D1RawQueryRequest,
} from '@/types/d1';
