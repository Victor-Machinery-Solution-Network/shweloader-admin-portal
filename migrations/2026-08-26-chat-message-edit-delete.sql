-- Admin edit/delete of ADMIN chat messages (Viber-style tombstone).
--
-- Soft delete only. The row stays so:
--   1. the "deleted this message" bubble still renders in thread order, and
--   2. chat_attachment rows stay referenced — a hard delete would let the
--      admin-portal-api R2 sweep cron trash the files (LIVE_KEYS_QUERY).
--
-- deleted_by is who pressed delete, which is NOT always cm.sender_id: any admin
-- holding the chat 'delete' permission can remove another admin's message.
-- It drives the perspective string ("You deleted this message" vs
-- "<Admin> deleted this message") and the audit trail.
--
-- Edits keep no prior-text column on purpose: the before/after pair goes to
-- admin_activity_log, which is the surface that survives Worker log retention.

ALTER TABLE chat_message ADD COLUMN edited_at TIMESTAMP;
ALTER TABLE chat_message ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE chat_message ADD COLUMN deleted_by INTEGER REFERENCES admin_user(user_id);
