# Getting Started with Admin Portal

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your D1 API token

# Run development server
npm run dev
```

Open [http://localhost:3000] (http://localhost:3000) to see the app.

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
- `/dashboard` - Redirects to `/dashboard/overview`
- `/dashboard/overview` - Overview page with UI component showcase
- `/dashboard/analytics` - Analytics dashboard
- `/admins`, `/brands`, `/customers`, `/equipment`, `/listings`, `/locations`, `/partners`, `/articles`, `/enquiries`, `/attachments`, `/carousel-images`, `/announcement-bar`, `/roles-permissions`, `/settings` - Feature pages

### ✅ Components
- **Layout**: Sidebar navigation, header, auth layout
- **Shared**: Page header, empty state, loading skeletons
- **UI**: 28 shadcn/ui components (button, card, input, data-table, multi-select, sonner, spinner, etc.)

### ✅ Patterns
- Server Components for data fetching
- Server Actions for mutations
- Client Components for interactivity
- Loading states with Suspense
- Error boundaries

## Next Steps

### 1. ✅ Database Connected

This project uses **Cloudflare D1** via REST API. Configuration:

```bash
# .env.local
NEXT_PUBLIC_D1_API_URL=https://cloudflare-d1-rest-api.shweloader.workers.dev
D1_API_TOKEN=your-secret-token
```

### 2. Create Entity Services

Create type-safe services for your database tables:

```typescript
// src/lib/services/brands.ts
import { createService } from '@/lib/api';

export interface Brand {
  id: number;
  name: string;
  logo_url: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export const brandService = createService<Brand>('brands');
```

### 3. Add Authentication

Recommended: NextAuth.js v5 (Auth.js)
```bash
npm install next-auth@beta
```

Create [src/auth.ts](../src/auth.ts) and configure providers.

### 4. Connect Data

Use the D1 client in your pages and actions:

```typescript
// src/app/(dashboard)/brands/page.tsx
import { brandService } from '@/lib/services/brands';

export default async function BrandsPage() {
  const brands = await brandService.list({ sort_by: 'name' });
  return <BrandTable brands={brands} />;
}
```

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
// ✅ Server Component - Using D1 service
import { brandService } from '@/lib/services/brands';

export default async function BrandsPage() {
  const brands = await brandService.list({ limit: 20 });
  return <BrandList brands={brands} />;
}

// ✅ Server Action - Mutations with D1
'use server'
import { brandService } from '@/lib/services/brands';

export async function deleteBrand(id: number) {
  await brandService.delete(id);
  revalidatePath('/brands');
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

- Check [DATA-FETCHING.md](./DATA-FETCHING.md) for D1 API usage
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed patterns
- Review example implementations in `src/app/(dashboard)/`
- Follow Next.js best practices from the skill documentation
