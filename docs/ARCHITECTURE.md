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

### Server Components (Default)
```typescript
// app/(dashboard)/users/page.tsx
export default async function UsersPage() {
  const users = await db.getUsers(); // Direct data access
  return <UserTable users={users} />;
}
```

### Server Actions (Mutations)
```typescript
// lib/actions/users.ts
'use server'
export async function createUser(data: FormData) {
  const result = await db.insertUser(data);
  revalidatePath('/users');
  return result;
}
```

### Client Components (Interactivity)
```typescript
// components/features/users/user-form.tsx
'use client'
import { createUser } from '@/lib/actions/users';

export function UserForm() {
  return <form action={createUser}>...</form>;
}
```

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
// app/(dashboard)/users/loading.tsx
export default function Loading() {
  return <UserTableSkeleton />;
}
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
