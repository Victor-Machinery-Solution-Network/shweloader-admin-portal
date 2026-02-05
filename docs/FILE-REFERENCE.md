# Complete File Reference

This document provides a comprehensive reference of all files in the project, their purpose, and usage.

## 📁 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication route group
│   │   ├── layout.tsx           # Auth layout (centered, no sidebar)
│   │   └── login/
│   │       └── page.tsx         # Login page (/login)
│   │
│   ├── (dashboard)/              # Dashboard route group
│   │   ├── layout.tsx           # Dashboard layout (sidebar + header)
│   │   ├── dashboard/
│   │   │   └── page.tsx         # Main dashboard (/dashboard)
│   │   └── users/
│   │       ├── page.tsx         # Users list (/users)
│   │       └── loading.tsx      # Loading state for users page
│   │
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Root page (redirects to dashboard)
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # 404 page
│   └── globals.css               # Global styles
│
├── components/
│   ├── ui/                       # shadcn/ui primitive components
│   │   ├── alert-dialog.tsx     # Alert dialog component
│   │   ├── badge.tsx            # Badge component
│   │   ├── button.tsx           # Button component
│   │   ├── card.tsx             # Card component
│   │   ├── combobox.tsx         # Combobox/autocomplete
│   │   ├── dropdown-menu.tsx    # Dropdown menu
│   │   ├── field.tsx            # Form field wrapper
│   │   ├── input.tsx            # Input component
│   │   ├── input-group.tsx      # Input group component
│   │   ├── label.tsx            # Label component
│   │   ├── select.tsx           # Select component
│   │   ├── separator.tsx        # Separator/divider
│   │   ├── skeleton.tsx         # Loading skeleton
│   │   └── textarea.tsx         # Textarea component
│   │
│   ├── layout/                   # Layout components
│   │   ├── app-sidebar.tsx      # Main sidebar navigation
│   │   └── app-header.tsx       # Main header bar
│   │
│   ├── shared/                   # Shared reusable components
│   │   ├── page-header.tsx      # Page title and actions header
│   │   ├── empty-state.tsx      # Empty state placeholder
│   │   └── loading-skeleton.tsx # Loading skeleton variants
│   │
│   └── features/                 # Feature-specific components (ready for use)
│       ├── users/               # User management components
│       ├── products/            # Product management components
│       ├── orders/              # Order management components
│       └── dashboard/           # Dashboard-specific components
│
├── lib/                          # Core application logic
│   ├── actions/                  # Server Actions
│   │   └── example-actions.ts   # Example server actions (CRUD operations)
│   │
│   ├── api/                      # API client utilities
│   │   ├── client.ts            # API client functions (GET, POST, PUT, DELETE)
│   │   └── endpoints/           # API endpoint definitions (ready for use)
│   │       ├── users.ts         # User API endpoints
│   │       └── products.ts      # Product API endpoints
│   │
│   ├── db/                       # Database logic (ready for use)
│   │   ├── schema.ts            # Database schema definitions
│   │   └── queries.ts           # Database query functions
│   │
│   ├── validations/              # Validation schemas (ready for use)
│   │   ├── user.ts              # User validation schemas
│   │   └── product.ts           # Product validation schemas
│   │
│   ├── hooks/                    # Custom React hooks (ready for use)
│   │   ├── use-toast.ts         # Toast notification hook
│   │   └── use-table-state.ts   # Table state management hook
│   │
│   ├── utils.ts                  # Utility functions
│   └── constants.ts              # Application constants
│
├── types/                        # TypeScript type definitions
│   ├── index.ts                  # Core type definitions
│   └── api.ts                    # API-related types
│
└── middleware.ts                 # Request middleware (auth, redirects)
```

---

## 📄 File Details

### App Router Files

#### `src/app/(auth)/layout.tsx`
**Purpose**: Layout for authentication pages (login, register)
**Type**: Server Component
**Features**:
- Centered layout without sidebar
- Clean, minimal design for auth forms
- Route group `(auth)` doesn't affect URLs

**Usage**:
```typescript
// Wraps all pages in app/(auth)/
// Provides centered layout for login/register pages
```

---

#### `src/app/(auth)/login/page.tsx`
**Purpose**: Login page
**Route**: `/login`
**Type**: Server Component
**Features**:
- Email and password form
- Card-based layout
- Ready for authentication integration

**Usage**:
```typescript
// Add authentication logic with NextAuth.js or custom solution
// Form submits to Server Action or API endpoint
```

---

#### `src/app/(dashboard)/layout.tsx`
**Purpose**: Layout for all dashboard pages
**Type**: Server Component
**Features**:
- Includes sidebar navigation
- Includes header bar
- Wraps all admin pages

**Dependencies**:
- `AppSidebar` component
- `AppHeader` component

**Usage**:
```typescript
// Automatically wraps all pages in (dashboard) route group
// Provides consistent layout across admin pages
```

---

#### `src/app/(dashboard)/dashboard/page.tsx`
**Purpose**: Main dashboard page
**Route**: `/dashboard`
**Type**: Server Component (async)
**Features**:
- Dashboard statistics cards
- Recent activity sections
- Placeholder for data fetching

**Usage**:
```typescript
// Replace TODO comments with real data fetching:
export default async function DashboardPage() {
  const stats = await fetchDashboardStats();
  return <Dashboard stats={stats} />;
}
```

---

#### `src/app/(dashboard)/users/page.tsx`
**Purpose**: Users list page
**Route**: `/users`
**Type**: Server Component (async)
**Features**:
- Page header with "Add User" button
- Ready for user table implementation
- Placeholder for data fetching

**Usage**:
```typescript
// Fetch users and display in table:
export default async function UsersPage() {
  const users = await db.user.findMany();
  return <UserTable users={users} />;
}
```

---

#### `src/app/(dashboard)/users/loading.tsx`
**Purpose**: Loading state for users page
**Type**: Server Component
**Features**:
- Automatically shown while page loads
- Uses PageSkeleton component

**Usage**:
```typescript
// Automatically used by Next.js
// No need to import or call manually
```

---

#### `src/app/page.tsx`
**Purpose**: Root page that redirects to dashboard
**Route**: `/`
**Type**: Server Component
**Features**:
- Redirects to dashboard
- TODO: Add authentication check

**Usage**:
```typescript
// Customize redirect logic based on auth status:
export default function HomePage() {
  const session = await getServerSession();
  if (!session) redirect('/login');
  redirect('/dashboard');
}
```

---

#### `src/app/error.tsx`
**Purpose**: Global error boundary
**Type**: Client Component (required)
**Features**:
- Catches errors in any route
- Shows error message
- Provides retry button
- Logs errors to console

**Usage**:
```typescript
// Automatically catches errors
// Customize error reporting:
useEffect(() => {
  logErrorToService(error);
}, [error]);
```

---

#### `src/app/not-found.tsx`
**Purpose**: 404 page for non-existent routes
**Type**: Server Component
**Features**:
- Friendly 404 message
- Link back to dashboard
- Icon illustration

**Usage**:
```typescript
// Automatically shown for 404s
// Can be customized with different messaging
```

---

#### `src/middleware.ts`
**Purpose**: Request middleware for authentication and redirects
**Type**: Edge Middleware
**Features**:
- Runs before every request
- Checks authentication status
- Redirects unauthenticated users
- Prevents authenticated users from accessing auth pages

**Usage**:
```typescript
// Configure routes and authentication:
export function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token && !isPublicRoute) {
    return NextResponse.redirect('/login');
  }
}
```

---

### Component Files

#### `src/components/layout/app-sidebar.tsx`
**Purpose**: Main sidebar navigation
**Type**: Client Component
**Features**:
- Navigation links for all main routes
- Active route highlighting
- Icon-based navigation
- Uses `usePathname` for active state

**Props**: None

**Usage**:
```typescript
import { AppSidebar } from '@/components/layout/app-sidebar';

// Used in dashboard layout
<AppSidebar />
```

**Customization**:
```typescript
// Add new navigation items in the `navigation` array:
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Page', href: '/new-page', icon: NewIcon }, // Add here
];
```

---

#### `src/components/layout/app-header.tsx`
**Purpose**: Main application header
**Type**: Client Component
**Features**:
- Page title display
- Notification bell
- User profile button
- Fixed height (h-16)

**Props**: None

**Usage**:
```typescript
import { AppHeader } from '@/components/layout/app-header';

// Used in dashboard layout
<AppHeader />
```

**Customization**:
```typescript
// Add search bar, breadcrumbs, or other header elements
// Connect notification and profile buttons to real functionality
```

---

#### `src/components/shared/page-header.tsx`
**Purpose**: Reusable page header with title and actions
**Type**: Server Component
**Features**:
- Title and description
- Action buttons slot (children)
- Consistent spacing and borders

**Props**:
```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // Action buttons
}
```

**Usage**:
```typescript
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';

<PageHeader
  title="Users"
  description="Manage all users"
>
  <Button>Add User</Button>
</PageHeader>
```

---

#### `src/components/shared/empty-state.tsx`
**Purpose**: Empty state placeholder for tables and lists
**Type**: Server Component
**Features**:
- Icon display
- Title and description
- Action button slot

**Props**:
```typescript
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

**Usage**:
```typescript
import { EmptyState } from '@/components/shared/empty-state';
import { Users } from 'lucide-react';

<EmptyState
  icon={Users}
  title="No users found"
  description="Get started by creating your first user"
  action={<Button>Add User</Button>}
/>
```

---

#### `src/components/shared/loading-skeleton.tsx`
**Purpose**: Loading skeleton components
**Type**: Server Component
**Features**:
- Multiple skeleton variants (Table, Card, Page)
- Customizable row counts
- Consistent loading states

**Components**:
- `TableSkeleton` - For table loading states
- `CardSkeleton` - For card loading states
- `PageSkeleton` - For full page loading states

**Usage**:
```typescript
import { TableSkeleton, CardSkeleton } from '@/components/shared/loading-skeleton';

// In loading.tsx:
export default function Loading() {
  return <TableSkeleton rows={10} />;
}

// For cards:
{isLoading ? <CardSkeleton /> : <Card>...</Card>}
```

---

### Library Files

#### `src/lib/constants.ts`
**Purpose**: Application-wide constants
**Type**: TypeScript module
**Features**:
- Route constants
- API route constants
- Configuration values
- Format strings

**Exports**:
```typescript
export const APP_NAME = 'Admin Portal';
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  // ... more routes
};
export const ITEMS_PER_PAGE = 20;
```

**Usage**:
```typescript
import { ROUTES, ITEMS_PER_PAGE } from '@/lib/constants';

redirect(ROUTES.LOGIN);
const users = await db.user.findMany({ take: ITEMS_PER_PAGE });
```

---

#### `src/lib/actions/example-actions.ts`
**Purpose**: Example Server Actions for CRUD operations
**Type**: Server Actions module
**Features**:
- Create, update, delete examples
- Form data handling
- Path revalidation
- Error handling patterns

**Exports**:
- `createUser(formData: FormData)` - Create new user
- `updateUser(id: string, formData: FormData)` - Update user
- `deleteUser(id: string)` - Delete user
- `createUserAndRedirect(formData: FormData)` - Create and redirect

**Usage**:
```typescript
'use client'
import { createUser } from '@/lib/actions/example-actions';

export function UserForm() {
  return (
    <form action={createUser}>
      <input name="name" />
      <input name="email" />
      <button type="submit">Create</button>
    </form>
  );
}
```

**Pattern**:
```typescript
'use server'
export async function createResource(formData: FormData) {
  // 1. Extract data
  const data = Object.fromEntries(formData);

  // 2. Validate
  const validated = schema.parse(data);

  // 3. Database operation
  const result = await db.insert(validated);

  // 4. Revalidate
  revalidatePath('/resources');

  // 5. Return result
  return { success: true, data: result };
}
```

---

#### `src/lib/api/client.ts`
**Purpose**: API client for HTTP requests
**Type**: TypeScript module
**Features**:
- GET, POST, PUT, DELETE helpers
- Error handling
- Type-safe responses
- Base URL configuration

**Exports**:
- `apiGet<T>(endpoint, options?)` - GET request
- `apiPost<T>(endpoint, data?, options?)` - POST request
- `apiPut<T>(endpoint, data?, options?)` - PUT request
- `apiDelete<T>(endpoint, options?)` - DELETE request
- `ApiError` - Custom error class

**Usage**:
```typescript
'use client'
import { apiGet, apiPost } from '@/lib/api/client';
import type { User } from '@/types';

// Fetch data
const { data } = await apiGet<User[]>('/users');

// Create resource
const { data: newUser } = await apiPost<User>('/users', {
  name: 'John',
  email: 'john@example.com'
});

// Error handling
try {
  await apiPost('/users', userData);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.message);
  }
}
```

---

#### `src/lib/utils.ts`
**Purpose**: Utility functions
**Type**: TypeScript module
**Features**:
- `cn()` - Class name merging with clsx and tailwind-merge

**Usage**:
```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  'conditional-class'
)} />
```

---

### Type Files

#### `src/types/index.ts`
**Purpose**: Core type definitions
**Type**: TypeScript module
**Features**:
- Domain model types (User, Product, Order)
- Paginated response types
- Error types

**Exports**:
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

**Usage**:
```typescript
import type { User, Product } from '@/types';

const user: User = await fetchUser(id);
```

---

#### `src/types/api.ts`
**Purpose**: API-related type definitions
**Type**: TypeScript module
**Features**:
- HTTP method types
- API response types
- Query parameter types

**Exports**:
```typescript
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  query?: string;
}
```

---

## 🔄 Common Patterns

### Creating a New Page
1. Create directory in `src/app/(dashboard)/`
2. Add `page.tsx` with metadata
3. Add `loading.tsx` for loading state
4. Update sidebar navigation

### Creating a Feature
1. Create directory in `src/components/features/[feature]/`
2. Add components (form, table, filters, etc.)
3. Create Server Actions in `src/lib/actions/[feature].ts`
4. Add types in `src/types/`
5. Add validation schemas in `src/lib/validations/[feature].ts`

### Adding a Form
1. Create form component in `src/components/features/`
2. Use `'use client'` directive
3. Create Server Action for submission
4. Use `action` prop on form element
5. Add validation with Zod

---

## 📦 Dependencies

### Production
- `next`: 16.1.6 - Framework
- `react`: 19.2.3 - UI library
- `react-dom`: 19.2.3 - React DOM
- `tailwindcss`: ^4 - Styling
- `lucide-react`: ^0.563.0 - Icons
- `class-variance-authority`: ^0.7.1 - Variant styling
- `clsx`: ^2.1.1 - Class names
- `tailwind-merge`: ^3.4.0 - Tailwind class merging

### Development
- `typescript`: ^5 - Type safety
- `eslint`: ^9 - Linting
- `@tailwindcss/postcss`: ^4 - PostCSS plugin
- `babel-plugin-react-compiler`: 1.0.0 - React compiler

---

## 🎯 Next Steps

1. **Connect Database**: Add Prisma or Drizzle ORM
2. **Add Authentication**: Implement NextAuth.js v5
3. **Implement Features**: Build out user, product, order management
4. **Add Testing**: Set up Vitest or Jest
5. **Add Validation**: Implement Zod schemas
6. **Add State Management**: Use React Context or Zustand if needed
7. **Add Forms**: Implement React Hook Form
8. **Add Tables**: Build data table components with sorting/filtering
