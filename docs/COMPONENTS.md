# Component Documentation

Complete guide to all components in the admin portal, including usage examples, props, and best practices.

## Table of Contents

- [UI Components (shadcn/ui)](#ui-components-shadcnui)
- [Layout Components](#layout-components)
- [Shared Components](#shared-components)
- [Feature Components](#feature-components)
- [Component Patterns](#component-patterns)
- [Creating New Components](#creating-new-components)

---

## UI Components (shadcn/ui)

Base primitive components from shadcn/ui. These are low-level, highly reusable components.

### Button

**File**: `src/components/ui/button.tsx`

**Usage**:

```typescript
import { Button } from '@/components/ui/button';

// Basic button
<Button>Click me</Button>

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon</Button>

// With icon
import { Plus } from 'lucide-react';
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add User
</Button>

// As link
<Button asChild>
  <Link href="/users">Go to Users</Link>
</Button>
```

**Props**:

```typescript
interface ButtonProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  // ... extends HTML button attributes
}
```

---

### Card

**File**: `src/components/ui/card.tsx`

**Usage**:

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Simple card
<Card className="p-6">
  <h3 className="font-semibold">Simple Card</h3>
  <p>Content here</p>
</Card>

// Stats card
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
    <Users className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">1,234</div>
    <p className="text-xs text-muted-foreground">+12.5% from last month</p>
  </CardContent>
</Card>
```

---

### Input

**File**: `src/components/ui/input.tsx`

**Usage**:

```typescript
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Basic input
<Input type="text" placeholder="Enter text" />

// With label
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="name@example.com" />
</div>

// Controlled input
const [value, setValue] = useState('');
<Input value={value} onChange={(e) => setValue(e.target.value)} />

// With validation
<Input
  type="email"
  required
  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
/>

// Disabled
<Input disabled placeholder="Disabled input" />
```

**Props**:

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // All standard HTML input attributes
}
```

---

### Select

**File**: `src/components/ui/select.tsx`

**Usage**:

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select a fruit" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="apple">Apple</SelectItem>
    <SelectItem value="banana">Banana</SelectItem>
    <SelectItem value="orange">Orange</SelectItem>
  </SelectContent>
</Select>

// With label
<div className="space-y-2">
  <Label htmlFor="role">Role</Label>
  <Select name="role">
    <SelectTrigger id="role">
      <SelectValue placeholder="Select role" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="admin">Admin</SelectItem>
      <SelectItem value="user">User</SelectItem>
    </SelectContent>
  </Select>
</div>

// Controlled
const [value, setValue] = useState('');
<Select value={value} onValueChange={setValue}>
  {/* ... */}
</Select>
```

---

### Dropdown Menu

**File**: `src/components/ui/dropdown-menu.tsx`

**Usage**:

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// Action menu
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => handleEdit()}>
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleDelete()}>
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Alert Dialog

**File**: `src/components/ui/alert-dialog.tsx`

**Usage**:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete the user.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleDelete()}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Badge

**File**: `src/components/ui/badge.tsx`

**Usage**:

```typescript
import { Badge } from '@/components/ui/badge';

// Variants
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>

// Status badges
<Badge variant={status === 'active' ? 'default' : 'secondary'}>
  {status}
</Badge>

// Count badges
<div className="flex items-center gap-2">
  <span>Notifications</span>
  <Badge>3</Badge>
</div>
```

---

### Skeleton

**File**: `src/components/ui/skeleton.tsx`

**Usage**:

```typescript
import { Skeleton } from '@/components/ui/skeleton';

// Basic skeleton
<Skeleton className="h-4 w-full" />
<Skeleton className="h-8 w-1/2" />

// Card skeleton
<div className="space-y-2">
  <Skeleton className="h-4 w-1/4" />
  <Skeleton className="h-8 w-1/2" />
  <Skeleton className="h-4 w-full" />
</div>

// Avatar skeleton
<Skeleton className="h-12 w-12 rounded-full" />
```

---

### Checkbox

**File**: `src/components/ui/checkbox.tsx`

```typescript
import { Checkbox } from '@/components/ui/checkbox';

<Checkbox />
<Checkbox checked={checked} onCheckedChange={setChecked} />
<Checkbox disabled />
```

---

### DataTable

**File**: `src/components/ui/data-table.tsx`

Built on TanStack Table (`@tanstack/react-table`) + shadcn Table primitives.

```typescript
import { DataTable, DataTableColumnHeader, getSelectColumn } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<User>[] = [
  getSelectColumn<User>(),
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  },
];

<DataTable
  columns={columns}
  data={users}
  searchKey="name"
  searchPlaceholder="Search users..."
  enableSelection
  enablePagination
  pageSize={10}
/>
```

**Features**: Column sorting, search/filter, pagination with rows-per-page, bulk select with checkboxes.

---

### Dialog

**File**: `src/components/ui/dialog.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>
    <p>Content</p>
  </DialogContent>
</Dialog>
```

---

### MultiSelect

**File**: `src/components/ui/multi-select.tsx`

Custom component using Popover + Command (cmdk) for searchable multi-select.

```typescript
import { MultiSelect } from '@/components/ui/multi-select';

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
];

<MultiSelect
  options={options}
  defaultValue={['react']}
  onValueChange={(values) => console.log(values)}
  placeholder="Select frameworks"
  maxCount={3}
  searchable
/>
```

**Features**: Search filtering, select all/clear all, badge chips with remove, maxCount limit.

---

### Popover

**File**: `src/components/ui/popover.tsx`

```typescript
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

<Popover>
  <PopoverTrigger asChild><Button>Open</Button></PopoverTrigger>
  <PopoverContent>Content here</PopoverContent>
</Popover>
```

---

### Command

**File**: `src/components/ui/command.tsx`

Command palette component built on cmdk.

```typescript
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty } from '@/components/ui/command';

<Command>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandEmpty>No results.</CommandEmpty>
    <CommandGroup>
      <CommandItem>Item 1</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

---

### Sonner (Toast)

**File**: `src/components/ui/sonner.tsx`

Toast notification system using Sonner. Add `<Toaster />` to your layout.

```typescript
import { toast } from "sonner";

toast.success("Saved successfully");
toast.error("Something went wrong");
toast.info("Info message");
toast.warning("Warning message");
toast("Default toast", {
  description: "With description",
  action: { label: "Undo", onClick: () => {} },
});
```

---

### Spinner

**File**: `src/components/ui/spinner.tsx`

SVG arc loading spinner with `animate-spin`.

```typescript
import { Spinner } from '@/components/ui/spinner';

<Spinner />
<Spinner className="size-6" />
<Button disabled><Spinner className="mr-2" /> Loading...</Button>
```

---

### Tabs

**File**: `src/components/ui/tabs.tsx`

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

---

## Layout Components

### AppSidebar

**File**: `src/components/layout/app-sidebar.tsx`
**Type**: Client Component

**Purpose**: Main navigation sidebar for the admin portal.

**Features**:

- Route-based active state highlighting
- Icon-based navigation
- Responsive design
- Sticky positioning

**Usage**:

```typescript
import { AppSidebar } from '@/components/layout/app-sidebar';

// Used in dashboard layout
<div className="flex">
  <AppSidebar />
  <main className="flex-1">{children}</main>
</div>
```

**Customization**:

```typescript
// Add new navigation items
const navigation = [
  { name: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: 'Users', href: ROUTES.USERS, icon: Users },
  // Add your new routes here
  { name: 'Analytics', href: '/analytics', icon: BarChart },
];

// Add section dividers
<nav className="space-y-1 px-3">
  {primaryNav.map((item) => (
    <NavLink key={item.name} {...item} />
  ))}
  <Separator className="my-2" />
  {secondaryNav.map((item) => (
    <NavLink key={item.name} {...item} />
  ))}
</nav>
```

**Styling**:

- Width: `w-64` (256px)
- Background: `bg-muted/40`
- Border: `border-r`

---

### AppHeader

**File**: `src/components/layout/app-header.tsx`
**Type**: Client Component

**Purpose**: Top header bar for the admin portal.

**Features**:

- Fixed height layout
- Right-aligned action buttons
- Notification and profile icons

**Usage**:

```typescript
import { AppHeader } from '@/components/layout/app-header';

// Used in dashboard layout
<div className="flex flex-col">
  <AppHeader />
  <main className="flex-1">{children}</main>
</div>
```

**Customization**:

```typescript
// Add search bar
export function AppHeader() {
  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-medium">Dashboard</h1>
          <Input
            type="search"
            placeholder="Search..."
            className="w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* ... */}
        </div>
      </div>
    </header>
  );
}

// Add breadcrumbs
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
<div className="flex items-center gap-4">
  <Breadcrumbs />
</div>
```

---

## Shared Components

### PageHeader

**File**: `src/components/shared/page-header.tsx`
**Type**: Server Component

**Purpose**: Consistent page header with title, description, and actions.

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
import { Plus } from 'lucide-react';

// Basic usage
<PageHeader
  title="Users"
  description="Manage all users in the system"
/>

// With actions
<PageHeader
  title="Users"
  description="Manage all users in the system"
>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Add User
  </Button>
</PageHeader>

// Multiple actions
<PageHeader title="Products">
  <div className="flex items-center gap-2">
    <Button variant="outline">Export</Button>
    <Button>Add Product</Button>
  </div>
</PageHeader>
```

**Styling**:

- Bottom border with padding
- Title: `text-3xl font-bold tracking-tight`
- Description: `text-muted-foreground`

---

### EmptyState

**File**: `src/components/shared/empty-state.tsx`
**Type**: Server Component

**Purpose**: Friendly empty state for tables and lists.

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
import { Users, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';

// No data state
{users.length === 0 && (
  <EmptyState
    icon={Users}
    title="No users found"
    description="Get started by creating your first user"
    action={
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Add User
      </Button>
    }
  />
)}

// No results state
{filteredUsers.length === 0 && (
  <EmptyState
    icon={FileX}
    title="No results found"
    description="Try adjusting your search or filters"
  />
)}

// Error state
{error && (
  <EmptyState
    icon={AlertCircle}
    title="Failed to load data"
    description={error.message}
    action={<Button onClick={retry}>Try Again</Button>}
  />
)}
```

**Best Practices**:

- Use appropriate icons for context
- Provide clear, actionable messages
- Include action buttons when relevant
- Keep descriptions concise

---

### LoadingSkeleton

**File**: `src/components/shared/loading-skeleton.tsx`
**Type**: Server Component

**Purpose**: Loading state skeletons for different layouts.

**Components**:

- `TableSkeleton` - For table views
- `CardSkeleton` - For card views
- `PageSkeleton` - For full pages

**Props**:

```typescript
interface TableSkeletonProps {
  rows?: number; // Default: 5
}
```

**Usage**:

```typescript
import { TableSkeleton, CardSkeleton, PageSkeleton } from '@/components/shared/loading-skeleton';

// In loading.tsx
export default function Loading() {
  return <TableSkeleton rows={10} />;
}

// Conditional loading
{isLoading ? (
  <TableSkeleton />
) : (
  <UserTable data={users} />
)}

// Card grid loading
<div className="grid gap-4 md:grid-cols-3">
  {isLoading ? (
    <>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </>
  ) : (
    cards.map((card) => <Card key={card.id} {...card} />)
  )}
</div>

// Full page loading
{isLoading ? <PageSkeleton /> : <PageContent />}
```

**Customization**:

```typescript
// Custom skeleton
export function UserCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </Card>
  );
}
```

---

## Feature Components

Feature components are domain-specific components organized by feature area.

### Structure (Actual)

```
src/components/features/
├── equipment/
│   ├── main/
│   │   ├── columns.tsx                  # DataTable column definitions
│   │   ├── main-categories-client.tsx   # Client component (state, reorder, bulk delete)
│   │   ├── main-category-form.tsx       # Create/edit dialog form
│   │   └── row-actions.tsx              # Per-row dropdown (Edit/Delete)
│   └── sub/
│       ├── columns.tsx                  # Columns with main category badge
│       ├── sub-categories-client.tsx    # Client component with linked count bulk delete
│       ├── sub-category-form.tsx        # Create/edit with category dropdown
│       └── row-actions.tsx              # Delete with linked count warnings
│
├── attachments/
│   └── categories/
│       ├── columns.tsx                  # DataTable column definitions
│       ├── attachment-categories-client.tsx  # Client with bulk delete + linked counts
│       ├── category-form.tsx            # Create/edit dialog form
│       └── row-actions.tsx              # Delete with linked count warnings
│
└── brands/
    ├── columns.tsx                      # Columns with BadgeList overflow (+X more tooltip)
    ├── brands-client.tsx                # Client with multi-junction bulk delete
    ├── brand-form.tsx                   # Form with 2 MultiSelect (categories + sub-categories)
    └── row-actions.tsx                  # Delete with detailed linked count breakdown
```

### Component Pattern Per Feature

Each feature follows a consistent 4-file pattern:

| File              | Purpose                                                 | Type   |
| ----------------- | ------------------------------------------------------- | ------ |
| `columns.tsx`     | TanStack Table column definitions                       | Shared |
| `*-client.tsx`    | Client wrapper (state, reorder, bulk delete, toolbar)   | Client |
| `*-form.tsx`      | Create/edit dialog with server action submission        | Client |
| `row-actions.tsx` | Per-row dropdown menu (Edit, Delete) with delete dialog | Client |

### Key Patterns

**Drag-and-Drop Reordering**: All category pages support `@dnd-kit` row reordering via `DataTable`'s `enableDragSort` + `onReorder` callback that calls a server action to update `display_order`.

**Junction Table Management**: Brands link to both attachment categories and equipment sub-categories via many-to-many junction tables (`attachment_category_brand`, `equipment_sub_category_brand`). The brand form uses two `MultiSelect` components and syncs junction tables on create/update.

**Delete Warnings with Linked Counts**: Delete dialogs query linked records before showing the confirmation. For example, deleting a brand shows: _"There are 3 equipment models, 2 attachment categories and 1 equipment sub-category linked to this brand."_

**Badge Overflow with Tooltip**: When a row has more than 2 category badges, a `BadgeList` component renders the first 2 and shows a "+X more" badge. Hovering the overflow badge reveals a `Tooltip` listing all remaining categories.

**Bulk Delete with Async Descriptions**: `BulkDeleteButton` accepts a `buildDescription` callback that aggregates linked counts across all selected rows before showing the delete dialog.

### Example: Row Actions with Linked Count Warnings

```typescript
// src/components/features/equipment/sub/row-actions.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import {
  deleteSubCategory,
  getSubCategoryLinkedCounts,
  formatSubCategoryLinkedSummary,
} from "@/lib/actions/equipment";

export function RowActions({ subCategory, categories }: RowActionsProps) {
  const [deleteDescription, setDeleteDescription] = useState("");

  // Fetch linked counts when delete dialog opens
  useEffect(() => {
    if (showDelete) {
      getSubCategoryLinkedCounts([subCategory.sub_category_id]).then(
        async (counts) => {
          const c = counts[subCategory.sub_category_id];
          if (c && c.total > 0) {
            const summary = await formatSubCategoryLinkedSummary(c);
            setDeleteDescription(
              `This will permanently delete "${subCategory.name}". There ${c.total === 1 ? "is" : "are"} ${summary} linked to this sub category.`,
            );
          } else {
            setDeleteDescription(
              `This will permanently delete "${subCategory.name}". This action cannot be undone.`,
            );
          }
        },
      );
    }
  }, [showDelete, subCategory.sub_category_id]);
  // ...
}
```

### Example: Brand Form with Multi-Select Junction Tables

```typescript
// src/components/features/brands/brand-form.tsx — key pattern
// Two MultiSelect components for many-to-many relationships:
<MultiSelect
  options={categories.map((c) => ({ value: String(c.category_id), label: c.name }))}
  selected={selectedCategoryIds}
  onChange={setSelectedCategoryIds}
  placeholder="Select attachment categories..."
/>
<MultiSelect
  options={subCategories.map((s) => ({ value: String(s.sub_category_id), label: s.name }))}
  selected={selectedSubCategoryIds}
  onChange={setSelectedSubCategoryIds}
  placeholder="Select equipment sub-categories..."
/>
// Selected IDs are serialized as JSON in formData and synced via junction table helpers
```

### Example: Badge Overflow with Tooltip

```typescript
// src/components/features/brands/columns.tsx
const MAX_VISIBLE_BADGES = 2;

function BadgeList({ items, variant }: { items: string[]; variant?: BadgeProps['variant'] }) {
  const visible = items.slice(0, MAX_VISIBLE_BADGES);
  const overflow = items.slice(MAX_VISIBLE_BADGES);

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item) => <Badge key={item} variant={variant}>{item}</Badge>)}
      {overflow.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-default">+{overflow.length} more</Badge>
            </TooltipTrigger>
            <TooltipContent>{overflow.join(', ')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
```

---

## Component Patterns

### Server vs Client Components

**Server Components** (default):

```typescript
// No 'use client' directive
// Can be async
// Can access database directly
// Cannot use hooks or event handlers

export default async function UserList() {
  const users = await db.user.findMany();
  return <UserTable users={users} />;
}
```

**Client Components**:

```typescript
'use client'
// Must have 'use client' directive
// Can use hooks and event handlers
// Cannot be async
// Cannot access database directly

import { useState } from 'react';

export function UserFilters() {
  const [search, setSearch] = useState('');
  return <Input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

### Composition Pattern

```typescript
// Good: Composable components
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>

// Avoid: Monolithic components with too many props
<Card
  title="Title"
  content="Content"
  showHeader={true}
  showFooter={false}
  // ... many more props
/>
```

### Data Fetching Pattern

```typescript
// Parent: Server Component (fetches data)
export default async function UsersPage() {
  const users = await fetchUsers();
  return <UserList users={users} />;
}

// Child: Client Component (interactive)
'use client'
export function UserList({ users }: { users: User[] }) {
  const [filter, setFilter] = useState('');
  const filtered = users.filter(u => u.name.includes(filter));
  return (
    <>
      <Input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <UserTable users={filtered} />
    </>
  );
}
```

---

## Creating New Components

### Step-by-Step Guide

1. **Determine component type**:
   - UI primitive → `src/components/ui/`
   - Layout → `src/components/layout/`
   - Shared → `src/components/shared/`
   - Feature-specific → `src/components/features/[feature]/`

2. **Create component file**:

   ```bash
   touch src/components/features/users/user-card.tsx
   ```

3. **Write component**:

   ```typescript
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
   import { Avatar } from '@/components/ui/avatar';
   import type { User } from '@/types';

   interface UserCardProps {
     user: User;
   }

   export function UserCard({ user }: UserCardProps) {
     return (
       <Card>
         <CardHeader>
           <CardTitle>{user.name}</CardTitle>
         </CardHeader>
         <CardContent>
           <p>{user.email}</p>
         </CardContent>
       </Card>
     );
   }
   ```

4. **Export from index (optional)**:

   ```typescript
   // src/components/features/users/index.ts
   export { UserCard } from "./user-card";
   export { UserTable } from "./user-table";
   export { UserForm } from "./user-form";
   ```

5. **Use component**:
   ```typescript
   import { UserCard } from "@/components/features/users/user-card";
   // or
   import { UserCard } from "@/components/features/users";
   ```

### Best Practices

1. **Single Responsibility**: Each component should do one thing well
2. **Type Safety**: Always define prop interfaces
3. **Accessibility**: Use semantic HTML and ARIA attributes
4. **Performance**: Use `memo()` for expensive renders
5. **Composition**: Prefer composition over configuration
6. **Naming**: Use descriptive, action-based names
7. **Documentation**: Add JSDoc comments for complex components

---

## Component Testing

### Example Test

```typescript
import { render, screen } from '@testing-library/react';
import { UserCard } from './user-card';

describe('UserCard', () => {
  it('renders user information', () => {
    const user = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    render(<UserCard user={user} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

---

## Styling Guidelines

### Tailwind Classes

```typescript
// Layout
className = "flex items-center justify-between";
className = "grid gap-4 md:grid-cols-2 lg:grid-cols-4";

// Spacing
className = "p-6 space-y-4";
className = "mt-4 mb-6 mx-auto";

// Typography
className = "text-3xl font-bold tracking-tight";
className = "text-sm text-muted-foreground";

// Colors
className = "bg-primary text-primary-foreground";
className = "bg-muted text-muted-foreground";

// Interactive
className = "hover:bg-accent hover:text-accent-foreground";
className = "focus:outline-none focus:ring-2 focus:ring-ring";
```

### Using cn() utility

```typescript
import { cn } from '@/lib/utils';

className={cn(
  'base-classes',
  isActive && 'active-classes',
  isDisabled && 'disabled-classes',
  props.className
)}
```

---

This component documentation provides comprehensive guidance for using and creating components in the admin portal. Refer to specific component files for implementation details.
