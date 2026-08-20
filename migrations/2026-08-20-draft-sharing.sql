-- ============================================================
-- Shared draft listings + optimistic concurrency
--
-- 1) product_list.updated_by  — powers the "Last modified by" column
-- 2) product_list.version     — compare-and-swap token, prevents lost updates
--    when two admins edit the same draft (see updateDraft/submitDraft).
-- 3) A `listing_drafts` RBAC feature so a Super Admin controls who may see /
--    edit / delete OTHER people's drafts. Your own drafts are always yours —
--    no grant needed — so a role with none of these behaves exactly as before.
--
-- Default grants mirror `sale_listings`: whoever can read/edit/delete sale
-- listings gets the matching draft verb, so the feature is live on day one and
-- the Super Admin can revoke per role in Roles & Permissions.
--
-- Sections 2-4 are idempotent (INSERT OR IGNORE). The section 1 ALTERs are NOT
-- re-runnable — SQLite has no ADD COLUMN IF NOT EXISTS; a second run errors
-- with "duplicate column name", which is harmless.
--
-- Apply to BOTH shweloader-dev and shweloader-prod, BEFORE deploying the code
-- (the new queries select these columns).
-- ============================================================

-- 1) Columns ------------------------------------------------------------
ALTER TABLE product_list ADD COLUMN updated_by INTEGER REFERENCES admin_user(user_id);
ALTER TABLE product_list ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Existing rows were last touched by whoever made them.
UPDATE product_list SET updated_by = created_by WHERE updated_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_list_updated_by ON product_list(updated_by);

-- 2) Feature ------------------------------------------------------------
-- display_order 17 puts it last in the Marketplace group (10-16). The value
-- collides with `users` (Users group), which is inert: role-form.tsx buckets
-- features by group_name, so the two are never ordered against each other.
INSERT OR IGNORE INTO feature (name, group_name, display_order)
VALUES ('listing_drafts', 'Marketplace', 17);

-- 3) Verbs: read = see others' drafts, edit = edit/submit them, delete = bin them
INSERT OR IGNORE INTO feature_permission (feature_id, permission_id)
SELECT f.feature_id, p.permission_id
FROM feature f
JOIN permission p ON p.name IN ('read', 'edit', 'delete')
WHERE f.name = 'listing_drafts';

-- 4) Grants: mirror each role's sale_listings access, verb for verb.
--    Super Admin holds every sale_listings verb, so it gets all three.
INSERT OR IGNORE INTO role_permission (role_id, feature_permission_id)
SELECT rp.role_id, fpd.feature_permission_id
FROM role_permission rp
JOIN feature_permission fps ON fps.feature_permission_id = rp.feature_permission_id
JOIN feature           fs  ON fs.feature_id = fps.feature_id AND fs.name = 'sale_listings'
JOIN permission        p   ON p.permission_id = fps.permission_id
                          AND p.name IN ('read', 'edit', 'delete')
JOIN feature           fd  ON fd.name = 'listing_drafts'
JOIN feature_permission fpd ON fpd.feature_id = fd.feature_id
                           AND fpd.permission_id = p.permission_id;
