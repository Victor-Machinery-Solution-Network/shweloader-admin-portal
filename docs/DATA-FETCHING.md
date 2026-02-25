# Data Fetching Guide

Complete guide to data fetching patterns in the Next.js admin portal using Server Components, Server Actions, and the D1 REST API.

## Table of Contents
- [Overview](#overview)
- [Cloudflare D1 REST API](#cloudflare-d1-rest-api)
- [Server Components](#server-components)
- [Server Actions](#server-actions)
- [Caching Strategies](#caching-strategies)
- [Error Handling](#error-handling)

---

## Overview

### Data Fetching Methods

| Method | Use Case | Location |
|--------|----------|----------|
| Server Components | Reading data | Server |
| Server Actions | Mutations (Create, Update, Delete) | Server |

### Decision Tree

```
Need to fetch data?
├─ For initial page load?
│  └─ Use Server Component with "use cache" ✅
│
└─ For form submission / mutation?
   └─ Use Server Action + invalidateTag() ✅
```

---

## Cloudflare D1 REST API

**This project uses Cloudflare D1 as the backend database, accessed via a REST API.**

### Configuration

Environment variables (`.env.local`):

```bash
# Cloudflare Worker REST API
CLOUDFLARE_WORKER_API_URL=https://api.staging.shweloader.com.mm

# API Token (server-side only)
CLOUDFLARE_WORKER_API_TOKEN=your-secret-token
```

### D1 Client

The D1 client provides low-level access to all REST API operations.

```typescript
import { d1 } from '@/lib/api';

// List records with filtering, sorting, pagination
const { results, meta } = await d1.list('users', {
  limit: 10,
  offset: 0,
  sort_by: 'created_at',
  order: 'desc',
  status: 'active',  // Filter by column
});

// Get single record by ID
const { results: [user] } = await d1.get('users', 123);

// Create record
const { results: [newUser] } = await d1.create('users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// Update record
const { results: [updated] } = await d1.update('users', 123, {
  name: 'Jane Doe',
});

// Delete record
await d1.delete('users', 123);

// Raw SQL query
const { results } = await d1.query(
  'SELECT * FROM users WHERE age > ? AND status = ? LIMIT ?',
  [21, 'active', 10]
);
```

### Service Factory (Recommended)

Create type-safe services for each table using the `createService` factory.

```typescript
// lib/services/brands.ts
import { createService } from '@/lib/api';

export interface Brand {
  id: number;
  name: string;
  logo_url: string | null;
  website: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export const brandService = createService<Brand>('brands');
```

Usage in Server Components:

```typescript
// app/(dashboard)/brands/page.tsx
import { brandService } from '@/lib/services/brands';

export default async function BrandsPage() {
  const brands = await brandService.list({
    sort_by: 'name',
    order: 'asc'
  });

  return <BrandTable brands={brands} />;
}
```

Usage in Server Actions:

```typescript
// lib/actions/brand.ts
'use server';

import { invalidateTag } from '@/lib/cache-invalidation';
import { CACHE_TAGS } from '@/lib/constants';
import { brandService } from '@/lib/services/brand';

export async function createBrand(formData: FormData) {
  const brand = await brandService.create({
    name: formData.get('name') as string,
    logo_url: formData.get('logo_url') as string,
  });

  invalidateTag(CACHE_TAGS.BRANDS); // Also invalidates dependent tags
  return { success: true, data: brand };
}

export async function updateBrand(id: number, formData: FormData) {
  const brand = await brandService.update(id, {
    name: formData.get('name') as string,
  });

  invalidateTag(CACHE_TAGS.BRANDS);
  return { success: true, data: brand };
}

export async function deleteBrand(id: number) {
  await brandService.delete(id);
  invalidateTag(CACHE_TAGS.BRANDS);
  return { success: true };
}
```

### Service API Reference

| Method | Description | Returns |
|--------|-------------|---------|
| `list(params?)` | List records with optional filters | `T[]` |
| `listWithMeta(params?)` | List with D1 metadata | `D1Response<T>` |
| `getById(id)` | Get single record | `T \| null` |
| `getByIdOrThrow(id)` | Get record or throw 404 | `T` |
| `create(data)` | Create new record | `T` |
| `update(id, data)` | Update existing record | `T` |
| `delete(id)` | Delete record | `void` |
| `exists(id)` | Check if record exists | `boolean` |
| `count(filters?)` | Count matching records | `number` |

### Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `sort_by` | Column to sort by | `sort_by: 'name'` |
| `order` | Sort direction | `order: 'desc'` |
| `limit` | Max records to return | `limit: 20` |
| `offset` | Records to skip | `offset: 40` |
| `[column]` | Filter by column value | `status: 'active'` |

### Error Handling

```typescript
import { D1Error } from '@/lib/api';

try {
  const brand = await brandService.getByIdOrThrow(999);
} catch (error) {
  if (error instanceof D1Error) {
    console.error(`D1 Error [${error.status}]: ${error.message}`);
    // D1 Error [404]: brands with id 999 not found
  }
}
```

### D1 Response Format

All D1 responses include metadata:

```typescript
interface D1Response<T> {
  success: true;
  meta: {
    served_by: string;
    served_by_region: string;
    duration: number;
    rows_read: number;
    rows_written: number;
    // ... more metadata
  };
  results: T[];
}
```

---

## Server Components

**Default way to fetch data in Next.js 16.**

### Basic Pattern

See the [Page Pattern](#page-pattern-component-level-caching) in the Caching Strategies section for the recommended sync page + Suspense + `"use cache"` approach.

### With Search Params

```typescript
interface PageProps {
  searchParams: Promise<{
    page?: string;
    filter?: string;
    sort?: string;
  }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const filter = params.filter || 'all';

  const users = await fetchUsers({
    page,
    filter,
    limit: 20,
  });

  return (
    <div>
      <UserFilters />
      <UserTable users={users.data} />
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(users.total / 20)}
      />
    </div>
  );
}
```

### Parallel Data Fetching

```typescript
export default async function DashboardPage() {
  // Fetch in parallel
  const [users, products, orders, stats] = await Promise.all([
    fetchUsers(),
    fetchProducts(),
    fetchOrders(),
    fetchStats(),
  ]);

  return (
    <div>
      <StatsCards stats={stats} />
      <RecentUsers users={users} />
      <RecentOrders orders={orders} />
    </div>
  );
}
```

### Sequential Data Fetching

```typescript
export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch user first
  const user = await fetchUser(id);

  // Then fetch dependent data
  const [orders, activities] = await Promise.all([
    fetchUserOrders(user.id),
    fetchUserActivities(user.id),
  ]);

  return (
    <div>
      <UserHeader user={user} />
      <UserOrders orders={orders} />
      <UserActivities activities={activities} />
    </div>
  );
}
```

### Streaming with Suspense

```typescript
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      {/* Show immediately */}
      <PageHeader title="Dashboard" />

      {/* Stream in as ready */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      <div className="grid grid-cols-2 gap-4">
        <Suspense fallback={<CardSkeleton />}>
          <RecentUsers />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <RecentOrders />
        </Suspense>
      </div>
    </div>
  );
}

// Each component fetches its own data
async function StatsCards() {
  const stats = await fetchStats();
  return <StatsCardsView stats={stats} />;
}

async function RecentUsers() {
  const users = await fetchRecentUsers();
  return <UserList users={users} />;
}
```

---

## Server Actions

**Preferred way to handle mutations.** See the [Service Factory](#service-factory-recommended) section above for complete CRUD examples using the D1 service + `invalidateTag()`.

### Using Server Actions in Forms

```typescript
'use client';

import { useActionState } from 'react';
import { createBrand } from '@/lib/actions/brand';

export function BrandForm() {
  const [state, formAction, isPending] = useActionState(createBrand, null);

  return (
    <form action={formAction} className="space-y-4">
      <Input name="name" required />

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Brand'}
      </Button>

      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
```

---

## Caching Strategies

This project uses **Cache Components** (`cacheComponents: true` in `next.config.ts`) with **Partial Prerendering (PPR)**. Caching is done at the **component level** using the `"use cache"` directive.

### Architecture Overview

```
page.tsx (sync)         → PageHeader (static shell, instant from CDN)
  └─ <Suspense>         → fallback={<DataTableSkeleton />}
       └─ Content()     → async component with "use cache" (cached data)
            └─ cache.ts → plain data-fetching functions (no caching)
```

- **`cache.ts`** — Plain data-fetching layer. No caching logic. Each function wraps a service call with default sort params.
- **Page data components** — Own the caching strategy via `"use cache"` + `cacheLife` + `cacheTag`.
- **`cache-invalidation.ts`** — Uses `updateTag()` for immediate cache invalidation in server actions.

### Page Pattern (Component-Level Caching)

Every data page follows this pattern:

```typescript
// app/(dashboard)/brands/page.tsx
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getBrands } from "@/lib/cache";
import { BrandsClient } from "@/components/features/brands/brands-client";

export const metadata = {
  title: "Brands",
  description: "Manage brands",
};

// Sync page function — renders static shell instantly
export default function BrandsPage() {
  return (
    <>
      <PageHeader title="Brands" description="Manage brands" />
      <Suspense fallback={<DataTableSkeleton />}>
        <BrandsContent />
      </Suspense>
    </>
  );
}

// Async data component — cached via "use cache"
async function BrandsContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.BRANDS);

  const brands = await getBrands();
  return <BrandsClient brands={brands} />;
}
```

### Cache Tiers

| Tier | TTL | `cacheLife` | Used For |
|------|-----|-------------|----------|
| Tier 1 (Lookup) | 5 min / 1 hr | `{ stale: 300, revalidate: 300, expire: 3600 }` | Brands, locations, categories, users, announcements |
| Tier 2 (Model) | 2 min / 30 min | `{ stale: 120, revalidate: 120, expire: 1800 }` | Equipment/attachment models, partners, articles, carousels, listings |

### Cache Tags

Tags are defined in `CACHE_TAGS` (`src/lib/constants.ts`). Each page data component tags itself with the entities it depends on:

```typescript
// Single entity page
cacheTag(CACHE_TAGS.ANNOUNCEMENTS);

// Multi-entity page — tag with ALL dependencies
cacheTag(
  CACHE_TAGS.RENT_LISTINGS,
  CACHE_TAGS.FEATURED_LISTINGS,
  CACHE_TAGS.PARTNERS,
  CACHE_TAGS.EQUIPMENT_MODELS,
  CACHE_TAGS.ATTACHMENT_MODELS,
  CACHE_TAGS.LOCATIONS,
);
```

### Cache Invalidation (Server Actions)

Use `invalidateTag()` from `cache-invalidation.ts` in server actions. It calls `updateTag()` (immediate invalidation + Router Cache) and resolves dependent tags recursively.

```typescript
// lib/actions/brand.ts
"use server";

import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";

export async function createBrand(data: FormData) {
  const brand = await brandService.create({ ... });

  // Invalidates BRANDS + dependent tags (EQUIPMENT_MODELS, ATTACHMENT_MODELS)
  invalidateTag(CACHE_TAGS.BRANDS);

  return { success: true, data: brand };
}
```

### Data-Fetching Layer (`cache.ts`)

Plain functions that wrap service calls with default sort params. **No caching here** — caching is at the component level.

```typescript
// src/lib/cache.ts
export function getBrands() {
  return brandService.list({ sort_by: "name", order: "asc" });
}

export function getLocations() {
  return locationService.list({ sort_by: "city_name", order: "asc" });
}
```

### Adding a New Cached Page

1. **Add data function** to `cache.ts` (plain function, no caching)
2. **Create page.tsx** with sync page + `<Suspense>` + async data component
3. **Add `"use cache"`** + `cacheLife()` + `cacheTag()` to the data component
4. **Add cache tag** to `CACHE_TAGS` in `constants.ts`
5. **Add dependencies** to `CACHE_DEPENDENTS` in `cache-invalidation.ts` if needed
6. **Call `invalidateTag()`** in server actions after mutations

---

## Error Handling

### Try-Catch Pattern

```typescript
export default async function UsersPage() {
  try {
    const users = await fetchUsers();
    return <UserTable users={users} />;
  } catch (error) {
    return (
      <div>
        <h2>Failed to load users</h2>
        <p>{error.message}</p>
      </div>
    );
  }
}
```

### Error Boundary

```typescript
// app/(dashboard)/users/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Not Found

```typescript
import { notFound } from 'next/navigation';

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await fetchUser(id);

  if (!user) {
    notFound(); // Shows not-found.tsx
  }

  return <UserDetail user={user} />;
}
```

---

This data fetching guide covers the D1 REST API, server components, server actions, caching, and error handling patterns used in the admin portal.
