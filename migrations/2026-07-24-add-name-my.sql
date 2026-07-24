-- Bilingual names: add name_my beside name. Nullable; required only at the app layer.
-- Run against dev D1 first, verify, then prod D1. ALTER ADD COLUMN is idempotent-unsafe
-- (errors if the column exists) — run once per environment.
ALTER TABLE equipment_main_category ADD COLUMN name_my TEXT;
ALTER TABLE equipment_sub_category ADD COLUMN name_my TEXT;
ALTER TABLE partner_type ADD COLUMN name_my TEXT;
