# Getting Started with Admin Portal

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Admin pages (users, products, etc.)
│   └── ...
├── components/            # React components
│   ├── ui/               # Base components (shadcn)
│   ├── layout/           # Layout components
│   ├── features/         # Feature-specific components
│   └── shared/           # Reusable components
├── lib/                  # Core logic
│   ├── actions/          # Server Actions
│   ├── api/              # API client
│   └── ...
└── types/                # TypeScript types
```

## Key Files

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Full architecture documentation
- [src/lib/constants.ts](../src/lib/constants.ts) - App constants and routes
- [src/middleware.ts](../src/middleware.ts) - Authentication middleware
- [src/app/(dashboard)/layout.tsx](../src/app/(dashboard)/layout.tsx) - Dashboard layout

## Implemented Features

### ✅ Route Structure
- `/login` - Login page with centered layout
- `/dashboard` - Main dashboard with stats
- `/users` - Users list (ready for data integration)

### ✅ Components
- **Layout**: Sidebar navigation, header, auth layout
- **Shared**: Page header, empty state, loading skeletons
- **UI**: shadcn/ui components (button, card, input, etc.)

### ✅ Patterns
- Server Components for data fetching
- Server Actions for mutations
- Client Components for interactivity
- Loading states with Suspense
- Error boundaries

## Next Steps

### 1. Set Up Database

Choose your database solution:

**Option A: PostgreSQL with Prisma**
```bash
npm install prisma @prisma/client
npx prisma init
```

**Option B: PostgreSQL with Drizzle**
```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

### 2. Add Authentication

Recommended: NextAuth.js v5 (Auth.js)
```bash
npm install next-auth@beta
```

Create [src/auth.ts](../src/auth.ts) and configure providers.

### 3. Connect Data

Replace TODO comments in:
- [src/lib/actions/example-actions.ts](../src/lib/actions/example-actions.ts)
- [src/app/(dashboard)/dashboard/page.tsx](../src/app/(dashboard)/dashboard/page.tsx)
- [src/app/(dashboard)/users/page.tsx](../src/app/(dashboard)/users/page.tsx)

### 4. Build Features

Use the existing patterns:

**Create a new page:**
```bash
# Create directory
mkdir -p src/app/\(dashboard\)/products

# Create page
touch src/app/\(dashboard\)/products/page.tsx
```

**Add Server Action:**
```typescript
// src/lib/actions/products.ts
'use server'
export async function createProduct(data: FormData) {
  // Implementation
}
```

**Create feature component:**
```typescript
// src/components/features/products/product-form.tsx
'use client'
export function ProductForm() {
  // Implementation
}
```

## Development Tips

### Server vs Client Components

**Use Server Components (default) for:**
- Data fetching
- Database access
- Rendering static content
- SEO metadata

**Use Client Components (`'use client'`) for:**
- Event handlers (onClick, onChange)
- React hooks (useState, useEffect)
- Browser APIs (localStorage, window)

### Data Fetching Pattern

```typescript
// ✅ Server Component - Direct data access
export default async function UsersPage() {
  const users = await db.user.findMany();
  return <UserList users={users} />;
}

// ✅ Server Action - Mutations
'use server'
export async function deleteUser(id: string) {
  await db.user.delete({ where: { id } });
  revalidatePath('/users');
}
```

### Avoid Waterfalls

```typescript
// ❌ Waterfall - slow
const user = await getUser(id);
const posts = await getPosts(user.id);

// ✅ Parallel - fast
const [user, posts] = await Promise.all([
  getUser(id),
  getPosts(id)
]);
```

## Common Tasks

### Add a new route
1. Create directory in `src/app/(dashboard)/`
2. Add `page.tsx` with metadata
3. Add to sidebar navigation in [src/components/layout/app-sidebar.tsx](../src/components/layout/app-sidebar.tsx)

### Add a new feature
1. Create feature directory in `src/components/features/`
2. Add server actions in `src/lib/actions/`
3. Add types in `src/types/`

### Style components
- Use Tailwind CSS classes
- Use shadcn/ui components from `src/components/ui/`
- Use `cn()` utility for conditional classes

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)

## Need Help?

- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed patterns
- Review example implementations in `src/app/(dashboard)/`
- Follow Next.js best practices from the skill documentation
