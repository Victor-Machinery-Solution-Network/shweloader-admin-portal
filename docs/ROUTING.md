# Routing & Navigation Guide

Complete guide to routing, navigation, and URL patterns in the Next.js admin portal.

## Table of Contents
- [App Router Overview](#app-router-overview)
- [Route Groups](#route-groups)
- [Dynamic Routes](#dynamic-routes)
- [Navigation](#navigation)
- [Middleware & Protection](#middleware--protection)
- [Advanced Patterns](#advanced-patterns)

---

## App Router Overview

Next.js 16 uses the App Router with file-system based routing. Each folder in `src/app/` creates a route segment.

### Special Files

| File | Purpose | Type |
|------|---------|------|
| `page.tsx` | Route page | Required for public route |
| `layout.tsx` | Layout wrapper | Wraps page and children |
| `loading.tsx` | Loading UI | Shown during loading |
| `error.tsx` | Error boundary | Catches errors |
| `not-found.tsx` | 404 page | Shown for missing routes |
| `route.ts` | API route handler | For API endpoints |

### Example Structure

```
app/
├── page.tsx                    # /
├── layout.tsx                  # Root layout
├── not-found.tsx               # 404 page
│
├── (auth)/                     # Route group (no URL segment)
│   ├── layout.tsx             # Auth layout
│   ├── login/
│   │   └── page.tsx           # /login
│   └── register/
│       └── page.tsx           # /register
│
└── (dashboard)/                # Route group (no URL segment)
    ├── layout.tsx             # Dashboard layout
    ├── dashboard/
    │   └── page.tsx           # /dashboard
    └── users/
        ├── page.tsx           # /users
        ├── loading.tsx        # Loading state
        ├── [id]/
        │   ├── page.tsx       # /users/:id
        │   └── edit/
        │       └── page.tsx   # /users/:id/edit
        └── new/
            └── page.tsx       # /users/new
```

---

## Route Groups

Route groups allow you to organize routes without affecting the URL structure.

### Syntax

Use parentheses `()` to create a route group:
- `(auth)/` - Auth pages
- `(dashboard)/` - Admin pages
- `(marketing)/` - Marketing pages

### Benefits

1. **Different Layouts**: Each group can have its own layout
2. **Organization**: Logical grouping without URL changes
3. **Code Splitting**: Better bundle organization

### Example: Auth vs Dashboard Layout

```typescript
// app/(auth)/layout.tsx - Centered layout
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      {children}
    </div>
  );
}

// app/(dashboard)/layout.tsx - Sidebar layout
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

**URLs remain unchanged**:
- `/login` → Uses auth layout
- `/dashboard` → Uses dashboard layout

---

## Dynamic Routes

Dynamic routes use brackets `[]` to create parameterized URLs.

### Single Dynamic Segment

```
users/[id]/page.tsx → /users/123
```

```typescript
// app/(dashboard)/users/[id]/page.tsx
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  // In Next.js 15+, params is async
  const { id } = await params;
  const user = await fetchUser(id);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Multiple Dynamic Segments

```
users/[id]/posts/[postId]/page.tsx → /users/123/posts/456
```

```typescript
interface PageProps {
  params: Promise<{
    id: string;
    postId: string;
  }>;
}

export default async function PostPage({ params }: PageProps) {
  const { id, postId } = await params;
  const post = await fetchPost(id, postId);
  return <PostDetail post={post} />;
}
```

### Catch-All Routes

```
docs/[...slug]/page.tsx
```

Matches:
- `/docs/a` → `{ slug: ['a'] }`
- `/docs/a/b` → `{ slug: ['a', 'b'] }`
- `/docs/a/b/c` → `{ slug: ['a', 'b', 'c'] }`

```typescript
interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params;
  const path = slug.join('/');
  const content = await fetchDoc(path);
  return <DocContent content={content} />;
}
```

### Optional Catch-All Routes

```
docs/[[...slug]]/page.tsx
```

Also matches:
- `/docs` → `{ slug: undefined }`

---

## Navigation

### Link Component

**Client-side navigation** (recommended):

```typescript
import Link from 'next/link';

// Basic link
<Link href="/users">View Users</Link>

// With styling
<Link
  href="/users"
  className="text-blue-600 hover:underline"
>
  View Users
</Link>

// Dynamic route
<Link href={`/users/${user.id}`}>
  View Profile
</Link>

// With query params
<Link href="/users?filter=active">
  Active Users
</Link>

// With object
<Link
  href={{
    pathname: '/users',
    query: { filter: 'active', page: '1' }
  }}
>
  Active Users
</Link>

// As child component
<Link href="/users" legacyBehavior>
  <Button>View Users</Button>
</Link>

// Or use asChild pattern
import { Button } from '@/components/ui/button';
<Button asChild>
  <Link href="/users">View Users</Link>
</Button>
```

### useRouter Hook

**Programmatic navigation** (Client Component only):

```typescript
'use client'

import { useRouter } from 'next/navigation';

export function UserForm() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await createUser(formData);
    // Navigate to users list
    router.push('/users');

    // Or with query params
    router.push('/users?success=true');

    // Replace history (no back button)
    router.replace('/users');

    // Go back
    router.back();

    // Refresh current route
    router.refresh();
  }

  return <form action={handleSubmit}>...</form>;
}
```

### redirect Function

**Server-side navigation** (Server Component only):

```typescript
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await getSession();

  if (!session) {
    // Redirect to login
    redirect('/login');
  }

  return <div>Protected content</div>;
}

// In Server Action
'use server'
export async function createUser(formData: FormData) {
  const user = await db.user.create(formData);
  redirect(`/users/${user.id}`);
}
```

### permanentRedirect Function

**Permanent redirect** (301 status):

```typescript
import { permanentRedirect } from 'next/navigation';

export default async function OldPage() {
  // Permanent redirect (301)
  permanentRedirect('/new-page');
}
```

---

## Navigation Hooks

### usePathname

Get current pathname:

```typescript
'use client'

import { usePathname } from 'next/navigation';

export function Breadcrumbs() {
  const pathname = usePathname();
  // pathname: '/users/123/edit'

  const segments = pathname.split('/').filter(Boolean);
  // segments: ['users', '123', 'edit']

  return (
    <nav>
      {segments.map((segment, i) => (
        <Link key={i} href={`/${segments.slice(0, i + 1).join('/')}`}>
          {segment}
        </Link>
      ))}
    </nav>
  );
}
```

### useSearchParams

Get URL search params:

```typescript
'use client'

import { useSearchParams } from 'next/navigation';

export function UserFilters() {
  const searchParams = useSearchParams();

  const filter = searchParams.get('filter'); // 'active'
  const page = searchParams.get('page'); // '1'

  return (
    <div>
      Filter: {filter}
      Page: {page}
    </div>
  );
}
```

**Important**: Wrap components using `useSearchParams` in `Suspense`:

```typescript
import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserFilters />
    </Suspense>
  );
}
```

### useParams

Get dynamic route params:

```typescript
'use client'

import { useParams } from 'next/navigation';

export function UserHeader() {
  const params = useParams();
  const userId = params.id; // '123'

  return <h1>User {userId}</h1>;
}
```

---

## Middleware & Protection

### Basic Middleware

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check authentication
  const token = request.cookies.get('token');

  if (!token && pathname.startsWith('/dashboard')) {
    // Redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Auth Middleware

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const publicRoutes = ['/login', '/register'];
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check token
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const user = await verifyToken(token);

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Add user to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

### Role-Based Protection

```typescript
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await getCurrentUser(request);

  // Admin-only routes
  if (pathname.startsWith('/admin')) {
    if (!user || user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}
```

---

## Advanced Patterns

### Parallel Routes

Show multiple pages in the same layout:

```
app/
├── @team/
│   └── page.tsx
├── @analytics/
│   └── page.tsx
└── page.tsx
```

```typescript
// app/layout.tsx
export default function Layout({
  children,
  team,
  analytics,
}: {
  children: React.ReactNode;
  team: React.ReactNode;
  analytics: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2 gap-4">
        {team}
        {analytics}
      </div>
    </div>
  );
}
```

### Intercepting Routes

Intercept navigation to show modals:

```
app/
├── photos/
│   └── [id]/
│       └── page.tsx
└── @modal/
    └── (.)photos/
        └── [id]/
            └── page.tsx
```

```typescript
// app/@modal/(.)photos/[id]/page.tsx
export default async function PhotoModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await fetchPhoto(id);

  return (
    <Dialog>
      <DialogContent>
        <img src={photo.url} alt={photo.title} />
      </DialogContent>
    </Dialog>
  );
}
```

**Navigation**:
- Click link → Opens modal
- Direct URL → Opens full page
- Close modal → Goes back

### Loading States

```typescript
// app/(dashboard)/users/loading.tsx
export default function Loading() {
  return <UserTableSkeleton />;
}

// Shown automatically while page.tsx loads
```

### Error Boundaries

```typescript
// app/(dashboard)/users/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Failed to load users</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Not Found Pages

```typescript
// app/(dashboard)/users/[id]/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>User not found</h2>
      <Link href="/users">Back to users</Link>
    </div>
  );
}

// Trigger not-found page
import { notFound } from 'next/navigation';

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await fetchUser(id);

  if (!user) {
    notFound(); // Shows not-found.tsx
  }

  return <UserDetail user={user} />;
}
```

---

## URL Patterns

### Query Parameters

**Reading**:
```typescript
// Server Component (page.tsx)
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filter = params.filter; // 'active'
  const page = Number(params.page || 1);

  const users = await fetchUsers({ filter, page });
  return <UserList users={users} />;
}

// Client Component
'use client'
import { useSearchParams } from 'next/navigation';

export function Filters() {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  return <div>Filter: {filter}</div>;
}
```

**Writing**:
```typescript
'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function Filters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(filter: string) {
    const params = new URLSearchParams(searchParams);
    params.set('filter', filter);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select onChange={(e) => updateFilter(e.target.value)}>
      <option value="all">All</option>
      <option value="active">Active</option>
    </select>
  );
}
```

### Hash Fragments

```typescript
// Scroll to element
<Link href="/users#active-users">
  View Active Users
</Link>

// Programmatic
router.push('/users#active-users');
```

---

## Best Practices

### 1. Use Link for Navigation

✅ **Good**:
```typescript
<Link href="/users">View Users</Link>
```

❌ **Avoid**:
```typescript
<a href="/users">View Users</a> // Full page reload
<button onClick={() => window.location.href = '/users'}>View Users</button>
```

### 2. Prefetching

Links are automatically prefetched:
```typescript
// Prefetch on hover (default)
<Link href="/users">View Users</Link>

// Disable prefetch
<Link href="/users" prefetch={false}>
  View Users
</Link>
```

### 3. Loading States

Always provide loading states:
```typescript
// loading.tsx for automatic loading
export default function Loading() {
  return <Skeleton />;
}

// Or use Suspense
<Suspense fallback={<Skeleton />}>
  <UserList />
</Suspense>
```

### 4. Error Handling

Add error boundaries:
```typescript
// error.tsx for automatic error handling
'use client'
export default function Error({ error, reset }) {
  return (
    <div>
      <p>Something went wrong</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### 5. Protected Routes

Use middleware for route protection:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const isAuthenticated = checkAuth(request);

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

---

## Common Patterns

### Breadcrumbs

```typescript
'use client'

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link href="/">Home</Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;

        return (
          <div key={segment} className="flex items-center gap-2">
            <span>/</span>
            {isLast ? (
              <span className="font-semibold capitalize">{segment}</span>
            ) : (
              <Link href={href} className="hover:underline capitalize">
                {segment}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
```

### Active Link

```typescript
'use client'

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-2 rounded-md',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      )}
    >
      {children}
    </Link>
  );
}
```

### Pagination

```typescript
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function Pagination({ totalPages }: { totalPages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get('page') || 1);

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <Button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </div>
  );
}
```

---

This routing guide covers all essential navigation patterns for the admin portal. Refer to the Next.js documentation for more advanced routing features.
