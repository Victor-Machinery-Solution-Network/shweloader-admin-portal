# Development Plan

## Current State

Phases 1–3 are largely complete. Auth is production-ready with Turnstile + rate limiting. Equipment categories, attachment categories, and brands have full CRUD with drag-and-drop reordering, many-to-many junction table management, and detailed delete warnings. The remaining pages (models, customers, partners, listings, CMS, roles, settings) are still placeholders.

---

## The Dependency Chain

The schema reveals a strict hierarchy. Building out of order means no data to reference:

```
Auth (admin_user, role)
  ↓
Lookup Tables (status types, locations, brands)
  ↓
Catalog (categories → sub-categories → models)
  ↓
Business (customers → partners → products → listings)
  ↓
CMS (articles, carousel, announcements)
```

---

## Phase 1 — Authentication (Start Here)

**Why first:** Every table has `created_by`, `approved_by`, `reviewed_by`. You cannot create meaningful records without a logged-in admin user. The middleware is a placeholder returning `true`.

- Wire up Auth.js (NextAuth v5) with credentials provider
- Implement login against `admin_user` table via D1 REST API
- Session management + middleware route protection
- Store `user_id` in session for audit fields

**Security hardening (completed):**

- bcrypt password hashing (cost factor 12)
- In-memory email-based rate limiting (5 attempts / 15 min lockout)
- Cloudflare Turnstile bot protection on login form
- Generic error messages (no email enumeration)
- JWT 8-hour session expiry, HttpOnly cookies
- Server-side input validation before DB queries
- `noValidate` form with custom `aria-invalid` email validation

**Status: COMPLETE**

---

## Phase 2 — Lookup Tables + Brands + Locations

**Why second:** These are the simplest CRUD and every downstream entity references them. They also establish the patterns (service → server actions → data table → form) that get reused 15+ times.

**Tables:** `partner_type`, `partner_status_type`, `enquiry_status_type`, `approval_status_type`, `article_status_type`, `product_brand`, `location`

- Build one fully (e.g., `product_brand`) with list/create/edit/delete
- Then replicate the pattern across all lookup tables
- This is where the reusable `DataTable` + form patterns get nailed down

**Completed items:**

- `product_brand` — Full CRUD with DataTable, search, pagination, drag-and-drop reordering
- Brand ↔ Attachment Category many-to-many via `attachment_category_brand` junction table
- Brand ↔ Equipment Sub-Category many-to-many via `equipment_sub_category_brand` junction table
- Multi-select UI in brand form for selecting linked categories/sub-categories
- Badge overflow with "+X more" tooltip when categories exceed 2
- Detailed delete warnings showing linked equipment models, attachment models, categories, and sub-categories
- Bulk delete with aggregated linked count descriptions

**Status: BRANDS COMPLETE** — Locations and other lookup tables still pending

---

## Phase 3 — Equipment & Attachment Catalog

**Why third:** This is the **core domain** — an equipment marketplace. No listings can exist without models, and no models without categories.

Build in order:

1. `equipment_main_category` (simple CRUD + image)
2. `equipment_sub_category` (CRUD + parent category dropdown)
3. `equipment_model` (CRUD + brand + sub-category + PDF upload)
4. `equipment_sub_category_brand` (bridge table management)
5. Then mirror for `attachment_category` → `attachment_model` → `attachment_category_brand`

**This establishes relational UI patterns** — dropdowns that depend on other entities, file uploads, nested navigation.

**Completed items:**

- `equipment_main_category` — Full CRUD, drag-and-drop reordering, linked sub-category count in delete warnings
- `equipment_sub_category` — Full CRUD with main category dropdown, drag-and-drop reordering, detailed delete warnings (linked equipment models + brands)
- `attachment_category` — Full CRUD, drag-and-drop reordering, detailed delete warnings (linked attachment models + brands)
- Junction table management for `equipment_sub_category_brand` and `attachment_category_brand` handled through brand form (Phase 2)

**Still pending:** `equipment_model`, `attachment_model` pages

**Status: CATEGORIES COMPLETE** — Model pages pending

---

## Phase 4 — Customers & Partners

**Why fourth:** Customers/partners are the marketplace users whose data feeds into listings.

- `customer` list with filters (verified, business type)
- `partner` management with status workflow (pending → approved/rejected)
- Partner review flow using `approval_status_type`

**This introduces the first workflow/status-driven UI** — not just CRUD but state transitions.

---

## Phase 5 — Listings (Sale + Rent) + Enquiries

**Why fifth:** This is where the business value lives. It depends on products, partners, and approval statuses all being in place.

- `product_list` (links partner → equipment or attachment model, images, custom fields)
- `sale_listing` / `rent_listing` with approval workflow
- `featured_listing` management
- `enquiry` management with status tracking

**Most complex phase** — approval workflows, image galleries, custom fields (JSON), dual-listing logic.

---

## Phase 6 — CMS (Articles, Carousel, Announcements)

**Why sixth:** Important but don't block the core marketplace. Can be built in parallel once patterns are established.

- `article_category` → `article` with status workflow + rich text editor
- `carousel` → `carousel_image` management with ordering
- `announcement_text` with display ordering

---

## Phase 7 — Roles/Permissions & Settings

**Why last:** A single "super admin" role can be hardcoded initially. Fine-grained RBAC is a polish feature.

- `role` CRUD with `feature_permission` assignment UI
- `role_permission` matrix editor
- `admin_user` management (invite, deactivate, assign roles)
- `app_setting` key-value management
- `admin_activity_log` viewer
- Dashboard analytics (overview page with real data)
