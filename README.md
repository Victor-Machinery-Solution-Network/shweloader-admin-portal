# Shweloader Admin Portal

Admin dashboard for the Shweloader heavy equipment marketplace. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4. Data is stored in Cloudflare D1 (accessed via REST API).

## Quick Start

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run seed:admin            # create the first admin user
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to login.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 + React 19 | App Router, Server Components & Actions |
| TypeScript 5 | Type safety |
| Tailwind CSS 4 + shadcn/ui | Styling & component library |
| Cloudflare D1 | Database (via REST API worker) |
| Auth.js v5 (next-auth) | Authentication (Credentials + JWT) |
| Cloudflare Turnstile | Bot protection on login |
| bcryptjs | Password hashing |

## Architecture

```
src/
├── app/
│   ├── (auth)/login/         # Login page
│   ├── (dashboard)/          # Admin pages (sidebar layout)
│   │   └── dashboard/        # Overview, future feature pages
│   ├── api/auth/[...nextauth]/ # Auth.js API route
│   └── page.tsx              # Root redirect
├── components/
│   ├── auth/                 # Login form, Turnstile widget
│   ├── layout/               # Sidebar, header
│   ├── providers/            # SessionProvider wrapper
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── actions/              # Server actions (auth, etc.)
│   ├── api/                  # D1 REST client & service factory
│   ├── auth.ts               # Auth.js config (providers, callbacks, rate limiting)
│   └── constants.ts          # Routes, app name
├── types/                    # TypeScript types (AdminUser, D1 types)
└── middleware.ts              # Auth.js route protection
```

## Authentication

Fully implemented with Auth.js v5:

- **Credentials provider** — email/password verified against `admin_user` table via D1
- **JWT sessions** — 8-hour expiry, HttpOnly cookies
- **Rate limiting** — in-memory, 5 failed attempts per email = 15 min lockout
- **Turnstile** — Cloudflare bot protection on the login form
- **bcrypt** — cost factor 12 for password hashing
- **Route protection** — middleware redirects unauthenticated users to `/login`

## Environment Variables

See [.env.example](.env.example) for all required variables:

- `NEXT_PUBLIC_D1_API_URL` / `D1_API_TOKEN` — Cloudflare D1 REST API
- `AUTH_SECRET` / `AUTH_URL` — Auth.js v5
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run seed:admin   # Seed first admin user into D1
```

## Hosting

- **Vercel** (free tier) for hosting
- **Cloudflare** (free tier) for DNS proxy + DDoS protection

## Documentation

Detailed guides in [`docs/`](./docs/):

- [Getting Started](./docs/GETTING-STARTED.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Components](./docs/COMPONENTS.md)
- [Routing](./docs/ROUTING.md)
- [Data Fetching](./docs/DATA-FETCHING.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Development Plan](./docs/DEVELOPMENT-PLAN.md)
- [File Reference](./docs/FILE-REFERENCE.md)

## Development Status

See [Development Plan](./docs/DEVELOPMENT-PLAN.md) for the full roadmap.

- [x] Phase 1 — Authentication
- [ ] Phase 2 — Lookup Tables + Brands + Locations
- [ ] Phase 3 — Catalog (Categories, Sub-categories, Models)
- [ ] Phase 4 — Business (Customers, Partners, Products, Listings)
- [ ] Phase 5 — CMS (Articles, Carousel, Announcements)
- [ ] Phase 6 — Admin User Management
- [ ] Phase 7 — Dashboard Overview & Analytics
