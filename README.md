# Shweloader Admin Portal

A modern, production-ready admin portal built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the admin portal.

## ✨ Features

- ✅ **Next.js 16** with App Router and React 19
- ✅ **TypeScript** for complete type safety
- ✅ **Tailwind CSS 4** with modern styling
- ✅ **shadcn/ui** component library
- ✅ **Server Components & Actions** for optimal performance
- ✅ **Route Groups** for organized layouts
- ✅ **Authentication-ready** middleware
- ✅ **Production-optimized** build configuration
- ✅ **Comprehensive documentation** (100+ KB)

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication pages
│   │   ├── login/           # Login page
│   │   └── layout.tsx       # Auth layout (centered)
│   ├── (dashboard)/         # Admin pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── users/           # User management
│   │   └── layout.tsx       # Dashboard layout (sidebar)
│   ├── page.tsx             # Root page (redirect)
│   ├── error.tsx            # Error boundary
│   └── not-found.tsx        # 404 page
│
├── components/              # React components
│   ├── ui/                 # shadcn/ui base components
│   ├── layout/             # Layout components (sidebar, header)
│   ├── features/           # Feature-specific components
│   └── shared/             # Reusable components
│
├── lib/                    # Core application logic
│   ├── actions/            # Server Actions
│   ├── api/                # API client
│   ├── constants.ts        # App constants
│   └── utils.ts            # Utility functions
│
├── types/                  # TypeScript type definitions
│   ├── index.ts           # Core types
│   └── api.ts             # API types
│
└── middleware.ts          # Request middleware (auth)
```

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

### Core Guides
- **[Getting Started](./docs/GETTING-STARTED.md)** - Setup and quick start
- **[Architecture](./docs/ARCHITECTURE.md)** - Project architecture and design decisions
- **[File Reference](./docs/FILE-REFERENCE.md)** - Complete file-by-file documentation
- **[Components](./docs/COMPONENTS.md)** - All components with usage examples
- **[Routing](./docs/ROUTING.md)** - Routing patterns and navigation
- **[Data Fetching](./docs/DATA-FETCHING.md)** - Server Components, Actions, and API patterns
- **[Deployment](./docs/DEPLOYMENT.md)** - Production deployment guide

📖 **[View Full Documentation Index →](./docs/README.md)**

## 🎯 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | React framework |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5 | Type safety |
| **Tailwind CSS** | 4 | Styling |
| **shadcn/ui** | Latest | Component library |
| **Lucide Icons** | Latest | Icon library |

## 🏗️ Key Features

### Route Organization
- **Route Groups**: `(auth)` and `(dashboard)` for different layouts
- **Dynamic Routes**: User detail pages with `[id]` segments
- **Loading States**: Automatic loading UI with `loading.tsx`
- **Error Boundaries**: Error handling with `error.tsx`

### Component Architecture
- **Server Components**: Default for data fetching
- **Client Components**: Interactive elements with `'use client'`
- **Shared Components**: Reusable UI elements
- **Feature Components**: Domain-specific logic

### Data Patterns
- **Server Actions**: Form submissions and mutations
- **Server Components**: Direct database access
- **API Routes**: External webhooks and APIs
- **Caching**: Built-in Next.js caching with revalidation

## 🚀 Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

## 🔧 Development Workflow

### Adding a New Page
1. Create `src/app/(dashboard)/[page-name]/page.tsx`
2. Add route to sidebar navigation
3. Create feature components
4. Add Server Actions if needed

### Adding a New Feature
1. Create directory in `src/components/features/[feature]/`
2. Add Server Actions in `src/lib/actions/[feature].ts`
3. Define types in `src/types/`
4. Create page in app router

## 🔐 Authentication

The project includes authentication-ready middleware in `src/middleware.ts`:
- Route protection
- Redirect logic
- Auth state management

**Recommended**: Integrate with [NextAuth.js v5](https://authjs.dev) (Auth.js)

```bash
npm install next-auth@beta
```

## 💾 Database

Ready to connect with your preferred database:

### Prisma (Recommended)
```bash
npm install prisma @prisma/client
npx prisma init
```

### Drizzle ORM
```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

## 🌐 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Docker
```bash
docker build -t admin-portal .
docker run -p 3000:3000 admin-portal
```

See the **[Deployment Guide](./docs/DEPLOYMENT.md)** for complete instructions.

## 📊 Project Statistics

- **38 TypeScript files** with complete type safety
- **6 comprehensive documentation files** (100+ KB)
- **Production-ready** structure and configuration
- **100% documented** core features

## 🎓 Learning Resources

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

## 📝 Code Examples

### Server Component with Data Fetching
```typescript
// app/(dashboard)/users/page.tsx
export default async function UsersPage() {
  const users = await db.user.findMany();
  return <UserTable users={users} />;
}
```

### Server Action for Mutations
```typescript
// lib/actions/users.ts
'use server'
export async function createUser(formData: FormData) {
  await db.user.create({ data: formData });
  revalidatePath('/users');
}
```

### Client Component with Interactivity
```typescript
// components/features/users/user-form.tsx
'use client'
export function UserForm() {
  return <form action={createUser}>...</form>;
}
```

## 🤝 Contributing

1. Follow the architecture patterns in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
2. Refer to [`docs/COMPONENTS.md`](./docs/COMPONENTS.md) for component guidelines
3. Follow Next.js best practices from [`docs/`](./docs/) guides

## 📞 Support

- 📖 Check the [Documentation](./docs/README.md)
- 🐛 Report issues on GitHub
- 💬 Ask questions in discussions

## 📄 License

This project is built with open-source technologies. See individual package licenses for details.

---

**Built with ❤️ using Next.js 16, React 19, and TypeScript**

[View Documentation](./docs/README.md) | [Getting Started](./docs/GETTING-STARTED.md) | [Architecture](./docs/ARCHITECTURE.md)
