# Getting Started with Admin Portal

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your D1 API token

# Run development server
pnpm dev
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
- `/dashboard` - Redirects to `/dashboard/overview`
- `/dashboard/overview` - Overview page with UI component showcase
- `/dashboard/analytics` - Analytics dashboard
- `/admins`, `/brands`, `/users`, `/equipment`, `/listings`, `/locations`, `/partners`, `/articles`, `/enquiries`, `/attachments`, `/carousel-images`, `/announcement-bar`, `/roles-permissions`, `/settings` - Feature pages

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
CLOUDFLARE_WORKER_API_URL=https://api.staging.shweloader.com.mm
CLOUDFLARE_WORKER_API_TOKEN=your-secret-token
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

## Resources

- [DATA-FETCHING.md](./DATA-FETCHING.md) for D1 API usage and caching patterns
- [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architectural patterns
- [COMPONENTS.md](./COMPONENTS.md) for component documentation
