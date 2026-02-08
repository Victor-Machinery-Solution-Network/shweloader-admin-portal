# Data Fetching Guide

Complete guide to data fetching patterns in the Next.js admin portal using Server Components, Server Actions, and API routes.

## Table of Contents
- [Overview](#overview)
- [Cloudflare D1 REST API](#cloudflare-d1-rest-api)
- [Server Components](#server-components)
- [Server Actions](#server-actions)
- [Client-Side Fetching](#client-side-fetching)
- [Caching Strategies](#caching-strategies)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

### Data Fetching Methods

| Method | Use Case | Location | Can be Async |
|--------|----------|----------|--------------|
| Server Components | Reading data | Server | ✅ Yes |
| Server Actions | Mutations (Create, Update, Delete) | Server | ✅ Yes |
| Route Handlers | External APIs, Webhooks | Server | ✅ Yes |
| Client Fetching | Dynamic client data | Client | ✅ Yes (with async/await) |

### Decision Tree

```
Need to fetch data?
├─ For initial page load?
│  └─ Use Server Component ✅
│
├─ For form submission / mutation?
│  └─ Use Server Action ✅
│
├─ For external webhook / API?
│  └─ Use Route Handler ✅
│
└─ For client-side dynamic data?
   └─ Use Client Component with fetch ✅
```

---

## Cloudflare D1 REST API

**This project uses Cloudflare D1 as the backend database, accessed via a REST API.**

### Configuration

Environment variables (`.env.local`):

```bash
# Public URL (can be exposed to client)
NEXT_PUBLIC_D1_API_URL=https://cloudflare-d1-rest-api.shweloader.workers.dev

# API Token (server-side only)
D1_API_TOKEN=your-secret-token
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
// lib/actions/brands.ts
'use server';

import { revalidatePath } from 'next/cache';
import { brandService } from '@/lib/services/brands';

export async function createBrand(formData: FormData) {
  const brand = await brandService.create({
    name: formData.get('name') as string,
    logo_url: formData.get('logo_url') as string,
    status: 'active',
  });

  revalidatePath('/brands');
  return { success: true, data: brand };
}

export async function updateBrand(id: number, formData: FormData) {
  const brand = await brandService.update(id, {
    name: formData.get('name') as string,
  });

  revalidatePath('/brands');
  revalidatePath(`/brands/${id}`);
  return { success: true, data: brand };
}

export async function deleteBrand(id: number) {
  await brandService.delete(id);
  revalidatePath('/brands');
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

```typescript
// app/(dashboard)/users/page.tsx
export default async function UsersPage() {
  // Fetch data directly in component
  const users = await fetchUsers();

  return (
    <div>
      <h1>Users</h1>
      <UserTable users={users} />
    </div>
  );
}

// Data fetching function
async function fetchUsers() {
  const res = await fetch('https://api.example.com/users', {
    next: { revalidate: 3600 } // Cache for 1 hour
  });

  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }

  return res.json();
}
```

### With Database

```typescript
// Using Prisma
import { prisma } from '@/lib/db';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return <UserTable users={users} />;
}

// Using Drizzle
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export default async function UsersPage() {
  const data = await db.select().from(users).limit(20);
  return <UserTable users={data} />;
}
```

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

**Preferred way to handle mutations.**

### Basic Server Action

```typescript
// lib/actions/users.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
});

export async function createUser(formData: FormData) {
  // 1. Extract and validate data
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
  };

  const validated = userSchema.parse(data);

  // 2. Database operation
  try {
    const user = await db.user.create({
      data: validated,
    });

    // 3. Revalidate cache
    revalidatePath('/users');

    // 4. Return success
    return { success: true, data: user };
  } catch (error) {
    // 5. Handle errors
    return { success: false, error: 'Failed to create user' };
  }
}
```

### Using Server Actions in Forms

```typescript
// components/features/users/user-form.tsx
'use client';

import { useActionState } from 'react';
import { createUser } from '@/lib/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function UserForm() {
  const [state, formAction, isPending] = useActionState(createUser, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label>Name</label>
        <Input name="name" required />
      </div>

      <div>
        <label>Email</label>
        <Input name="email" type="email" required />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </Button>

      {state?.error && (
        <p className="text-red-500">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-green-500">User created successfully!</p>
      )}
    </form>
  );
}
```

### Programmatic Server Actions

```typescript
'use client';

import { createUser } from '@/lib/actions/users';

export function CreateUserButton() {
  async function handleClick() {
    const formData = new FormData();
    formData.append('name', 'John Doe');
    formData.append('email', 'john@example.com');
    formData.append('role', 'user');

    const result = await createUser(formData);

    if (result.success) {
      console.log('User created:', result.data);
    } else {
      console.error('Error:', result.error);
    }
  }

  return <Button onClick={handleClick}>Create User</Button>;
}
```

### Update Action

```typescript
'use server';

export async function updateUser(id: string, formData: FormData) {
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
  };

  const validated = userSchema.parse(data);

  try {
    const user = await db.user.update({
      where: { id },
      data: validated,
    });

    revalidatePath('/users');
    revalidatePath(`/users/${id}`);

    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: 'Failed to update user' };
  }
}
```

### Delete Action

```typescript
'use server';

export async function deleteUser(id: string) {
  try {
    await db.user.delete({
      where: { id },
    });

    revalidatePath('/users');

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete user' };
  }
}
```

### With Redirect

```typescript
'use server';

import { redirect } from 'next/navigation';

export async function createUserAndRedirect(formData: FormData) {
  const result = await createUser(formData);

  if (!result.success) {
    return result;
  }

  // Redirect to user detail page
  redirect(`/users/${result.data.id}`);
}
```

---

## Client-Side Fetching

**For dynamic data that needs client-side updates.**

### Basic Client Fetch

```typescript
'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/types';

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');

        if (!res.ok) {
          throw new Error('Failed to fetch');
        }

        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <UserTable users={users} />;
}
```

### With SWR (Recommended)

```bash
npm install swr
```

```typescript
'use client';

import useSWR from 'swr';
import type { User } from '@/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function UserList() {
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    '/api/users',
    fetcher
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <Button onClick={() => mutate()}>Refresh</Button>
      <UserTable users={data || []} />
    </div>
  );
}
```

### With React Query (TanStack Query)

```bash
npm install @tanstack/react-query
```

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '@/lib/actions/users';

export function UserList() {
  const queryClient = useQueryClient();

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      return res.json();
    },
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      // Refetch users after creation
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <Button onClick={() => createMutation.mutate(formData)}>
        Create User
      </Button>
      <UserTable users={data || []} />
    </div>
  );
}
```

---

## Route Handlers

**For external APIs and webhooks.**

### Basic Route Handler

```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const users = await db.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await db.user.create({ data: body });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

### Dynamic Route Handler

```typescript
// app/api/users/[id]/route.ts
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const user = await db.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = await request.json();

  try {
    const user = await db.user.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
```

### Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handlePaymentSuccess(paymentIntent);
      break;
    // ... other event types
  }

  return NextResponse.json({ received: true });
}
```

---

## Caching Strategies

### Revalidation

```typescript
// Revalidate every 1 hour
const res = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }
});

// No caching
const res = await fetch('https://api.example.com/data', {
  cache: 'no-store'
});

// Force cache
const res = await fetch('https://api.example.com/data', {
  cache: 'force-cache'
});
```

### Cache Tags

```typescript
// Add cache tags
const user = await fetch(`https://api.example.com/users/${id}`, {
  next: { tags: [`user-${id}`, 'users'] }
});

// Revalidate by tag
import { revalidateTag } from 'next/cache';

export async function updateUser(id: string, data: any) {
  await db.user.update({ where: { id }, data });
  revalidateTag(`user-${id}`);
  revalidateTag('users');
}
```

### Path Revalidation

```typescript
import { revalidatePath } from 'next/cache';

export async function createUser(data: any) {
  const user = await db.user.create({ data });

  // Revalidate specific paths
  revalidatePath('/users');
  revalidatePath(`/users/${user.id}`);

  // Revalidate all user routes
  revalidatePath('/users', 'layout');
}
```

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

## Best Practices

### 1. Prefer Server Components

✅ **Good**:
```typescript
// Server Component - fetch data directly
export default async function UsersPage() {
  const users = await db.user.findMany();
  return <UserTable users={users} />;
}
```

❌ **Avoid**:
```typescript
// Client Component - extra roundtrip
'use client';
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);
  return <UserTable users={users} />;
}
```

### 2. Use Server Actions for Mutations

✅ **Good**:
```typescript
'use server';
export async function createUser(data: FormData) {
  await db.user.create({ data });
  revalidatePath('/users');
}
```

❌ **Avoid**:
```typescript
// Unnecessary API route
export async function POST(request: Request) {
  await db.user.create({ data: await request.json() });
  return NextResponse.json({ success: true });
}
```

### 3. Avoid Waterfalls

✅ **Good**:
```typescript
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts(),
]);
```

❌ **Avoid**:
```typescript
const users = await fetchUsers();
const posts = await fetchPosts(); // Waits for users
```

### 4. Use Suspense for Streaming

✅ **Good**:
```typescript
<Suspense fallback={<Skeleton />}>
  <DataComponent />
</Suspense>
```

### 5. Cache Wisely

```typescript
// Static data - cache forever
fetch(url, { cache: 'force-cache' });

// Dynamic data - short cache
fetch(url, { next: { revalidate: 60 } });

// Real-time data - no cache
fetch(url, { cache: 'no-store' });
```

### 6. Type Safety

```typescript
// Define types
interface User {
  id: string;
  name: string;
  email: string;
}

// Use in fetch
const users: User[] = await fetchUsers();
```

---

This data fetching guide provides comprehensive patterns for loading and mutating data in the admin portal using modern Next.js patterns.
