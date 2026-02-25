# Development Plan

## Current State

Phases 1–6 are substantially complete. The admin portal has full auth, equipment/attachment catalog (categories + models), user/partner management with approval workflows, sale/rent listings with featured content management, and CMS (articles, carousel, announcements). Phase 7 (RBAC + Settings) has schema + seed data ready but UI is still placeholder.

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
Business (users → partners → products → listings)
  ↓
CMS (articles, carousel, announcements)
  ↓
RBAC + Settings (roles, permissions, admin users, app settings)
```

---

## Phase 1 — Authentication

**Why first:** Every table has `created_by`, `approved_by`, `reviewed_by`. You cannot create meaningful records without a logged-in admin user.

**Completed:**

- Auth.js v5 with Credentials provider + JWT sessions
- Login against `admin_user` table via D1 REST API
- Session management + middleware route protection
- bcrypt password hashing (cost factor 12)
- In-memory email-based rate limiting (5 attempts / 15 min lockout)
- Cloudflare Turnstile bot protection on login form
- Generic error messages (no email enumeration)
- JWT 8-hour session expiry, HttpOnly cookies
- Server-side input validation before DB queries

**Status: COMPLETE**

---

## Phase 2 — Lookup Tables + Brands + Locations

**Why second:** Simplest CRUD, referenced by every downstream entity. Established the reusable patterns (service → server actions → DataTable → form dialog).

**Tables:** `partner_type`, `partner_status_type`, `enquiry_status_type`, `approval_status_type`, `article_status_type`, `condition_type`, `product_brand`, `location`, `business_type`

**Completed:**

- `product_brand` — Full CRUD with DataTable, search, pagination, drag-and-drop reordering, many-to-many junction table management (attachment_category_brand, equipment_sub_category_brand), multi-select UI, badge overflow with "+X more" tooltips, detailed delete warnings with linked counts, bulk delete
- `location` — Full CRUD with DataTable, linked listing count in delete warnings
- `business_type` — Full CRUD, embedded as second tab in Users page, linked user count tracking

**Still pending (no CRUD pages yet):**

- `partner_type`
- `partner_status_type`
- `enquiry_status_type`
- `approval_status_type`
- `article_status_type`
- `condition_type`

**Status: PARTIALLY COMPLETE** — 3 of 9 tables have CRUD pages

---

## Phase 3 — Equipment & Attachment Catalog

**Why third:** Core domain — an equipment marketplace. No listings can exist without models, and no models without categories.

**Completed:**

- `equipment_main_category` — Full CRUD, drag-and-drop reordering, linked sub-category count in delete warnings
- `equipment_sub_category` — Full CRUD with main category dropdown, drag-and-drop reordering, detailed delete warnings (linked equipment models + brands)
- `equipment_model` — Full CRUD with sub-category + brand dropdowns, PDF upload, linked sale/rent listing count tracking
- `attachment_category` — Full CRUD, drag-and-drop reordering, detailed delete warnings (linked attachment models + brands)
- `attachment_model` — Full CRUD with category + brand dropdowns, PDF upload, linked count tracking
- Junction table management for `equipment_sub_category_brand` and `attachment_category_brand` handled through brand form (Phase 2)

**Status: COMPLETE**

---

## Phase 4 — Users & Partners

**Why fourth:** Users/partners are the marketplace participants whose data feeds into listings.

**Completed:**

- `app_user` — List page with dual-tab interface (Users + Business Types), columns for id/name/phone/email/business type/verified status, business type filtering
- `partner` — List page with 3-tab approval workflow (Approved | Pending | Rejected), status badges with pending count indicator, approve/reject actions

**Status: COMPLETE**

---

## Phase 5 — Listings (Sale + Rent) + Enquiries

**Why fifth:** This is where the business value lives. Depends on products, partners, and approval statuses all being in place.

**Completed:**

- `sale_listing` — Full CRUD with multi-tab interface (Listings | Pending | Featured), listing form with partner/model/location/condition selection, image gallery with drag-reorder, approval workflow (approve/reject with reason), inline toggles (hidden, sold-out, featured), URL-driven state for tabs/filters/dialogs
- `rent_listing` — Same structure as sale listings (shared components), approval workflow, hidden toggle, featured management
- `featured_listing` — Managed within sale/rent pages, drag-and-drop reordering, add/remove from featured
- `product_list` + `product_image` — Unified creation supporting sale, rent, or both simultaneously, image sync with fractional display order keys, cascade deletes
- Complex 14-table JOINs for listing detail views
- Lazy-loaded ListingForm (616 lines) for performance

**Still pending:**

- `enquiry` — Page exists as empty placeholder (11 lines)

**Status: ~90% COMPLETE** — Enquiries page not built

---

## Phase 6 — CMS (Articles, Carousel, Announcements)

**Why sixth:** Important but don't block the core marketplace.

**Completed:**

- `article_category` — Full CRUD with DataTable, linked article count in delete warnings
- `article` — Full CRUD with dual-tab interface (Published | Pending), status workflow (Published/Hidden/Pending), category selection, search and filtering, bulk delete
- `carousel` — Multi-carousel management with tab-based interface, image grid with drag-and-drop reordering, image cards with title/link URL/button label, upload and delete support
- `announcement_text` — Full CRUD with DataTable, drag-and-drop reordering, bulk delete

**Status: COMPLETE**

---

## Phase 7 — Roles/Permissions & Settings

**Why last:** A single "super admin" role was sufficient during development. Fine-grained RBAC is a polish feature.

**Schema redesign (completed):**

- `feature_permission` table redesigned with `feature_permission_id` surrogate key (was composite PK)
- `role_permission` now references `feature_permission_id` instead of `permission_id` directly — enables per-feature permission control
- Seed script created (`scripts/seed-rbac.ts`) — idempotent, can be re-run in any environment
- Seeded data: 5 permissions (create, read, edit, delete, approve), 21 features (granular per entity), 83 feature_permission combos, Super Admin role with all 83 permissions

**Still pending (placeholder pages only):**

- `role` CRUD with `feature_permission` matrix editor (checkbox grid: features on rows, actions on columns)
- `admin_user` management (create, deactivate, assign roles)
- `app_setting` key-value management
- `admin_activity_log` viewer
- Dashboard analytics (overview page with real data, currently a component showcase)

**Status: SCHEMA + SEED COMPLETE** — UI not started

---

## Remaining Work Summary

| Priority | Item | Effort |
|----------|------|--------|
| 1 | Phase 7: Role CRUD + permission matrix UI | Medium |
| 2 | Phase 7: Admin user management (create, assign role, deactivate) | Medium |
| 3 | Phase 5: Enquiry management page | Small |
| 4 | Phase 2: Remaining lookup table CRUD pages (6 tables) | Small (replicate existing pattern) |
| 5 | Phase 7: App settings page | Small |
| 6 | Phase 7: Activity log viewer | Small |
| 7 | Phase 7: Dashboard with real analytics | Medium |
