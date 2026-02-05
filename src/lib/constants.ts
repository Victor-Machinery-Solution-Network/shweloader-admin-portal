/**
 * Application-wide constants
 */

export const APP_NAME = 'Admin Portal';
export const APP_DESCRIPTION = 'Admin portal for managing application resources';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  PRODUCTS: '/products',
  ORDERS: '/orders',
  SETTINGS: '/settings',
} as const;

export const API_ROUTES = {
  USERS: '/api/users',
  PRODUCTS: '/api/products',
  ORDERS: '/api/orders',
} as const;

export const ITEMS_PER_PAGE = 20;

export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
