# Admin Portal Architecture

## Project Overview
Next.js 16 admin portal with React 19, TypeScript, Tailwind CSS 4, and shadcn/ui.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.3 (with React Compiler)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Icons**: Lucide React, HugeIcons
- **Type Safety**: TypeScript 5

## Folder Structure Philosophy

### Route Organization
Use route groups `()` to organize pages without affecting URLs:

```
app/
  (auth)/          → /login, /register (no sidebar)
  (dashboard)/     → /dashboard, /users (with sidebar)
```

### Component Layers
1. **ui/** - Primitive components (shadcn)
2. **layout/** - Shell components (sidebar, header)
3. **features/** - Domain-specific logic (users, products)
4. **shared/** - Cross-cutting concerns (data-table, empty-state)

## Data Flow

### Server Components (Default) — with Cache Components
```typescript
// app/(dashboard)/brands/page.tsx
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { getBrands } from "@/lib/cache";

// Sync page — renders static shell instantly (PPR)
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

### Data Fetching Layer (`cache.ts`)
```typescript
// src/lib/cache.ts — plain functions, no caching here
export function getBrands() {
  return brandService.list({ sort_by: "name", order: "asc" });
}
```

### Server Actions (Mutations)
```typescript
// lib/actions/brand.ts
'use server'
import { invalidateTag } from '@/lib/cache-invalidation';
import { CACHE_TAGS } from '@/lib/constants';

export async function createBrand(data: FormData) {
  const result = await brandService.create({ ... });
  invalidateTag(CACHE_TAGS.BRANDS); // updateTag + dependent tags
  return result;
}
```

### Client Components (Interactivity)
```typescript
// components/features/brands/brand-form.tsx
'use client'
import { createBrand } from '@/lib/actions/brand';

export function BrandForm() {
  return <form action={createBrand}>...</form>;
}
```

## Caching Architecture

- **`cacheComponents: true`** in `next.config.ts` enables PPR
- **Static shell** (sidebar, PageHeader, nav) pre-rendered at build time → instant from CDN
- **`"use cache"` on page data components** — caches the rendered output with `cacheLife` and `cacheTag`
- **`cache.ts`** — plain data-fetching layer (no caching logic)
- **`cache-invalidation.ts`** — `invalidateTag()` calls `updateTag()` for immediate invalidation + resolves `CACHE_DEPENDENTS` recursively
- **Two cache tiers**: Tier 1 (5 min) for lookup tables, Tier 2 (2 min) for models/partners/listings
- **All data pages are `○ (Static)`** — pre-rendered at build time, no skeleton on navigation

## Routing Patterns

### Dynamic Routes
```
users/[id]/page.tsx          → /users/123
users/[id]/edit/page.tsx     → /users/123/edit
```

### Parallel Routes (Modals)
```
@modal/                       → Intercepting routes for modals
users/[id]/page.tsx
@modal/(.)users/[id]/page.tsx → Modal overlay
```

## Performance Patterns

### Avoid Waterfalls
```typescript
// ❌ Waterfall
const user = await getUser(id);
const orders = await getOrders(user.id);

// ✅ Parallel
const [user, orders] = await Promise.all([
  getUser(id),
  getOrders(id)
]);
```

### Image Optimization
```typescript
import Image from 'next/image';

<Image
  src="/avatar.jpg"
  alt="User"
  width={40}
  height={40}
  sizes="40px"
/>
```

### Font Optimization
```typescript
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
```

## Best Practices

### 1. Server Components First
Default to Server Components. Only use `'use client'` for:
- Event handlers (onClick, onChange)
- React hooks (useState, useEffect)
- Browser APIs (localStorage, window)

### 2. Prefer Server Actions
Use Server Actions instead of Route Handlers for:
- Form submissions
- Data mutations
- Authenticated operations

Only use Route Handlers for:
- Webhooks
- OAuth callbacks
- Public APIs

### 3. Error Handling
```typescript
// app/(dashboard)/error.tsx
'use client'
export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### 4. Loading States
```typescript
// Use Suspense boundaries in page.tsx (not loading.tsx files)
// With all pages static, skeletons are rarely seen
<Suspense fallback={<DataTableSkeleton />}>
  <DataContent />
</Suspense>
```

### 5. Metadata
```typescript
// app/(dashboard)/users/page.tsx
export const metadata = {
  title: 'Users | Admin',
  description: 'Manage users'
};
```

## File Naming Conventions

### Special Files (Next.js)
- `page.tsx` - Route page
- `layout.tsx` - Layout wrapper
- `loading.tsx` - Loading UI
- `error.tsx` - Error boundary
- `not-found.tsx` - 404 page
- `route.ts` - API route handler
- `middleware.ts` - Request middleware

### Components
- `user-table.tsx` - Kebab case
- `UserTable` - Component name (PascalCase)

### Actions & Utilities
- `lib/actions/users.ts` - Server actions
- `lib/utils.ts` - Utility functions

## Environment Variables
```bash
# .env.local
DATABASE_URL=
API_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Scripts
```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
```

## Next Steps
1. Set up authentication (NextAuth.js recommended)
2. Configure database (Prisma/Drizzle)
3. Implement core features (users, dashboard)
4. Add middleware for route protection
5. Configure environment variables
