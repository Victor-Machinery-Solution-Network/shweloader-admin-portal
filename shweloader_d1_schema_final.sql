PRAGMA foreign_keys = OFF;

-- =============================================
-- DROP ALL TABLES (reverse dependency order)
-- =============================================

DROP TABLE IF EXISTS chat_attachment;
DROP TABLE IF EXISTS chat_enquiry;
DROP TABLE IF EXISTS chat_message;
DROP TABLE IF EXISTS chat_session;
DROP TABLE IF EXISTS trash_metadata;
DROP TABLE IF EXISTS saved_item;
DROP TABLE IF EXISTS notification;
DROP TABLE IF EXISTS featured_listing;
DROP TABLE IF EXISTS rent_listing;
DROP TABLE IF EXISTS sale_listing;
DROP TABLE IF EXISTS product_image;
DROP TABLE IF EXISTS custom_field_template;
DROP TABLE IF EXISTS product_list;
DROP TABLE IF EXISTS attachment_category_brand;
DROP TABLE IF EXISTS attachment_model;
DROP TABLE IF EXISTS attachment_category;
DROP TABLE IF EXISTS equipment_sub_category_brand;
DROP TABLE IF EXISTS equipment_model;
DROP TABLE IF EXISTS equipment_sub_category;
DROP TABLE IF EXISTS equipment_main_category;
DROP TABLE IF EXISTS product_brand;
DROP TABLE IF EXISTS township;
DROP TABLE IF EXISTS district;
DROP TABLE IF EXISTS state_region;
DROP TABLE IF EXISTS app_setting;
DROP TABLE IF EXISTS promotion_push;
DROP TABLE IF EXISTS announcement_text;
DROP TABLE IF EXISTS carousel_image;
DROP TABLE IF EXISTS carousel;
DROP TABLE IF EXISTS image;
DROP TABLE IF EXISTS article;
DROP TABLE IF EXISTS article_category;
DROP TABLE IF EXISTS admin_activity_log;
DROP TABLE IF EXISTS blacklist;
DROP TABLE IF EXISTS partner;
DROP TABLE IF EXISTS app_user;
DROP TABLE IF EXISTS business_type;
DROP TABLE IF EXISTS role_permission;
DROP TABLE IF EXISTS admin_user;
DROP TABLE IF EXISTS role;
DROP TABLE IF EXISTS feature_permission;
DROP TABLE IF EXISTS permission;
DROP TABLE IF EXISTS feature;
DROP TABLE IF EXISTS condition_type;
DROP TABLE IF EXISTS article_status_type;
DROP TABLE IF EXISTS enquiry_status_type;
DROP TABLE IF EXISTS approval_status_type;
DROP TABLE IF EXISTS partner_status_type;
DROP TABLE IF EXISTS partner_type;
DROP TABLE IF EXISTS device_token;
DROP TABLE IF EXISTS app_feedback;

PRAGMA foreign_keys = ON;

-- =============================================
-- LOOKUP / TYPE TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS partner_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_type_name ON partner_type(name);

CREATE TABLE IF NOT EXISTS partner_status_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_status_type_name ON partner_status_type(status_name);

CREATE TABLE IF NOT EXISTS approval_status_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_status_type_name ON approval_status_type(status_name);

CREATE TABLE IF NOT EXISTS article_status_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_status_type_name ON article_status_type(status_name);

CREATE TABLE IF NOT EXISTS enquiry_status_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiry_status_type_name ON enquiry_status_type(status_name);

CREATE TABLE IF NOT EXISTS condition_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_condition_type_name ON condition_type(name);

-- =============================================
-- FEATURES & PERMISSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS feature (
    feature_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_name ON feature(name);

CREATE TABLE IF NOT EXISTS permission (
    permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_name ON permission(name);

CREATE TABLE IF NOT EXISTS feature_permission (
    feature_permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    FOREIGN KEY (feature_id) REFERENCES feature(feature_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permission(permission_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_permission_unique ON feature_permission(feature_id, permission_id);
CREATE INDEX IF NOT EXISTS idx_feature_permission_feature ON feature_permission(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_permission_permission ON feature_permission(permission_id);

-- =============================================
-- ROLE
-- =============================================

CREATE TABLE IF NOT EXISTS role (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_by INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_name ON role(name);
CREATE INDEX IF NOT EXISTS idx_role_created_by ON role(created_by);

-- =============================================
-- ADMIN USER
-- =============================================

CREATE TABLE IF NOT EXISTS admin_user (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    avatar_url TEXT DEFAULT NULL,
    FOREIGN KEY (role_id) REFERENCES role(role_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_user_username ON admin_user(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_user_email ON admin_user(email);
CREATE INDEX IF NOT EXISTS idx_admin_user_role ON admin_user(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_active ON admin_user(active);

-- =============================================
-- ROLE TRIGGERS (deferred FK via trigger)
-- =============================================

CREATE TRIGGER IF NOT EXISTS trg_role_created_by_validate
BEFORE INSERT ON role
WHEN NEW.created_by IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Invalid created_by: admin_user does not exist')
    WHERE NOT EXISTS (SELECT 1 FROM admin_user WHERE user_id = NEW.created_by);
END;

CREATE TRIGGER IF NOT EXISTS trg_role_created_by_validate_update
BEFORE UPDATE ON role
WHEN NEW.created_by IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Invalid created_by: admin_user does not exist')
    WHERE NOT EXISTS (SELECT 1 FROM admin_user WHERE user_id = NEW.created_by);
END;

-- =============================================
-- ROLE PERMISSION
-- =============================================

CREATE TABLE IF NOT EXISTS role_permission (
    role_id INTEGER NOT NULL,
    feature_permission_id INTEGER NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    PRIMARY KEY (role_id, feature_permission_id),
    FOREIGN KEY (role_id) REFERENCES role(role_id) ON DELETE CASCADE,
    FOREIGN KEY (feature_permission_id) REFERENCES feature_permission(feature_permission_id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_role_permission_role ON role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_feature_permission ON role_permission(feature_permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_granted_by ON role_permission(granted_by);

-- =============================================
-- BUSINESS TYPE
-- =============================================

CREATE TABLE IF NOT EXISTS business_type (
    business_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    is_listed INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_type_name ON business_type(name);
CREATE INDEX IF NOT EXISTS idx_business_type_created_by ON business_type(created_by);

-- =============================================
-- APP USER
-- =============================================

CREATE TABLE IF NOT EXISTS app_user (
    app_user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    password_hash TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    company_name TEXT,
    address TEXT,
    business_type_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    last_login_at TEXT,
    township_id INTEGER,
    FOREIGN KEY (business_type_id) REFERENCES business_type(business_type_id) ON DELETE RESTRICT,
    FOREIGN KEY (township_id) REFERENCES township(township_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_username ON app_user(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_user_email ON app_user(email);
CREATE INDEX IF NOT EXISTS idx_app_user_business_type ON app_user(business_type_id);
CREATE INDEX IF NOT EXISTS idx_app_user_township ON app_user(township_id);
CREATE INDEX IF NOT EXISTS idx_app_user_is_verified ON app_user(is_verified);
CREATE INDEX IF NOT EXISTS idx_app_user_phone ON app_user(phone, deleted_at);
CREATE INDEX IF NOT EXISTS idx_app_user_company_name ON app_user(company_name);
CREATE INDEX IF NOT EXISTS idx_app_user_deleted_at ON app_user(deleted_at);

-- =============================================
-- PARTNER
-- =============================================

CREATE TABLE IF NOT EXISTS partner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_user_id INTEGER,
    partner_type_id INTEGER,
    status_id INTEGER,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER,
    rejection_reason TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE CASCADE,
    FOREIGN KEY (partner_type_id) REFERENCES partner_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (status_id) REFERENCES partner_status_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_partner_app_user ON partner(app_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_type ON partner(partner_type_id);
CREATE INDEX IF NOT EXISTS idx_partner_status ON partner(status_id);
CREATE INDEX IF NOT EXISTS idx_partner_reviewed_by ON partner(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_partner_deleted_at ON partner(deleted_at);

-- ─── Chat System ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'active', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_preview TEXT,
    unread_admin_count INTEGER NOT NULL DEFAULT 0,
    unread_user_count INTEGER NOT NULL DEFAULT 0,
    admin_last_read_at TIMESTAMP,
    user_last_read_at TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    auto_replied_at TEXT DEFAULT NULL,
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_active_per_user
ON chat_session(app_user_id)
WHERE status != 'resolved' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_session_app_user ON chat_session(app_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_status ON chat_session(status);
CREATE INDEX IF NOT EXISTS idx_chat_session_active ON chat_session(deleted_at, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_session_created ON chat_session(created_at DESC);

CREATE TABLE IF NOT EXISTS chat_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_session_id INTEGER NOT NULL,
    sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'admin', 'system')),
    sender_id INTEGER NOT NULL,
    message TEXT,
    sale_listing_id INTEGER,
    rent_listing_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_session_id) REFERENCES chat_session(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_listing_id) REFERENCES sale_listing(id) ON DELETE SET NULL,
    FOREIGN KEY (rent_listing_id) REFERENCES rent_listing(id) ON DELETE SET NULL,
    CHECK (
        (sale_listing_id IS NULL AND rent_listing_id IS NULL)
        OR (sale_listing_id IS NOT NULL AND rent_listing_id IS NULL)
        OR (sale_listing_id IS NULL AND rent_listing_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_chat_message_session ON chat_message(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_created ON chat_message(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_message_session_created ON chat_message(chat_session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_message_session_listing ON chat_message(chat_session_id, sale_listing_id, rent_listing_id);

CREATE TABLE IF NOT EXISTS chat_attachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_message_id INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_message_id) REFERENCES chat_message(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_attachment_message ON chat_attachment(chat_message_id);

-- =============================================
-- CHAT ENQUIRY (product-inquiry tracking)
-- =============================================
-- One row per (chat_session, listing) pair. Populated by the worker on every
-- chat_message INSERT that has a sale_listing_id or rent_listing_id set
-- (regardless of sender_type). Dedup is enforced by partial unique indexes.

CREATE TABLE IF NOT EXISTS chat_enquiry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_session_id INTEGER NOT NULL,
    sale_listing_id INTEGER,
    rent_listing_id INTEGER,
    status_id INTEGER NOT NULL DEFAULT 1,
    close_outcome TEXT CHECK(close_outcome IN ('won', 'lost')),
    notes TEXT,
    first_message_id INTEGER NOT NULL,
    enquired_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (chat_session_id)  REFERENCES chat_session(id)        ON DELETE CASCADE,
    FOREIGN KEY (sale_listing_id)  REFERENCES sale_listing(id)        ON DELETE CASCADE,
    FOREIGN KEY (rent_listing_id)  REFERENCES rent_listing(id)        ON DELETE CASCADE,
    FOREIGN KEY (status_id)        REFERENCES enquiry_status_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (first_message_id) REFERENCES chat_message(id)        ON DELETE CASCADE,
    FOREIGN KEY (updated_by)       REFERENCES admin_user(user_id)     ON DELETE SET NULL,
    CHECK (
        (sale_listing_id IS NOT NULL AND rent_listing_id IS NULL)
        OR (sale_listing_id IS NULL AND rent_listing_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_enquiry_session_sale
    ON chat_enquiry(chat_session_id, sale_listing_id) WHERE sale_listing_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_enquiry_session_rent
    ON chat_enquiry(chat_session_id, rent_listing_id) WHERE rent_listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_enquiry_status        ON chat_enquiry(status_id);
CREATE INDEX IF NOT EXISTS idx_chat_enquiry_enquired_at   ON chat_enquiry(enquired_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_enquiry_sale_listing  ON chat_enquiry(sale_listing_id);
CREATE INDEX IF NOT EXISTS idx_chat_enquiry_rent_listing  ON chat_enquiry(rent_listing_id);

-- =============================================
-- ADMIN ACTIVITY LOG
-- =============================================

CREATE TABLE IF NOT EXISTS admin_activity_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    activity_description TEXT,
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES admin_user(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_user ON admin_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_date ON admin_activity_log(activity_date);

-- =============================================
-- BLACKLIST
-- =============================================

CREATE TABLE IF NOT EXISTS blacklist (
    blacklist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_user_id INTEGER NOT NULL,
    phone TEXT,
    email TEXT,
    company_name TEXT,
    reason TEXT NOT NULL,
    blacklisted_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE CASCADE,
    FOREIGN KEY (blacklisted_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_blacklist_app_user ON blacklist(app_user_id);
CREATE INDEX IF NOT EXISTS idx_blacklist_phone ON blacklist(phone);
CREATE INDEX IF NOT EXISTS idx_blacklist_email ON blacklist(email);
CREATE INDEX IF NOT EXISTS idx_blacklist_company ON blacklist(company_name);
CREATE INDEX IF NOT EXISTS idx_blacklist_blacklisted_by ON blacklist(blacklisted_by);

-- =============================================
-- ARTICLE CATEGORY
-- =============================================

CREATE TABLE IF NOT EXISTS article_category (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_category_name ON article_category(name);
CREATE INDEX IF NOT EXISTS idx_article_category_created_by ON article_category(created_by);

-- =============================================
-- ARTICLE
-- =============================================

CREATE TABLE IF NOT EXISTS article (
    article_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    created_by INTEGER,
    category_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    article_status_type_id INTEGER,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    publish_date TIMESTAMP,
    author_name TEXT,
    cover_image_url TEXT,
    cover_thumb_url TEXT,
    cover_blurhash TEXT,
    focal_x REAL NOT NULL DEFAULT 0.5,
    focal_y REAL NOT NULL DEFAULT 0.5,
    estimated_read_time INTEGER,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES article_category(category_id) ON DELETE SET NULL,
    FOREIGN KEY (article_status_type_id) REFERENCES article_status_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_article_created_by ON article(created_by);
CREATE INDEX IF NOT EXISTS idx_article_category ON article(category_id);
CREATE INDEX IF NOT EXISTS idx_article_status_type ON article(article_status_type_id);
CREATE INDEX IF NOT EXISTS idx_article_approved_by ON article(approved_by);
CREATE INDEX IF NOT EXISTS idx_article_publish_date ON article(publish_date);
CREATE INDEX IF NOT EXISTS idx_article_published ON article(deleted_at, article_status_type_id, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_article_created_at ON article(created_at);
CREATE INDEX IF NOT EXISTS idx_article_deleted_at ON article(deleted_at);

-- =============================================
-- IMAGE
-- =============================================

CREATE TABLE IF NOT EXISTS image (
    image_id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    thumb_url TEXT,
    blurhash TEXT,
    focal_x REAL NOT NULL DEFAULT 0.5,
    focal_y REAL NOT NULL DEFAULT 0.5,
    uploaded_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_image_uploaded_by ON image(uploaded_by);

-- =============================================
-- CAROUSEL
-- =============================================

CREATE TABLE IF NOT EXISTS carousel (
    carousel_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_carousel_name ON carousel(name);

-- =============================================
-- CAROUSEL IMAGE
-- =============================================

CREATE TABLE IF NOT EXISTS carousel_image (
    carousel_id INTEGER NOT NULL,
    image_id INTEGER NOT NULL,
    display_order TEXT DEFAULT '0',
    added_by INTEGER,
    active INTEGER DEFAULT 1,
    link_url TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (carousel_id, image_id),
    FOREIGN KEY (carousel_id) REFERENCES carousel(carousel_id) ON DELETE CASCADE,
    FOREIGN KEY (image_id) REFERENCES image(image_id) ON DELETE RESTRICT,
    FOREIGN KEY (added_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_carousel_image_carousel ON carousel_image(carousel_id);
CREATE INDEX IF NOT EXISTS idx_carousel_image_image ON carousel_image(image_id);
CREATE INDEX IF NOT EXISTS idx_carousel_image_active_order ON carousel_image(active, display_order);

-- =============================================
-- POPUP PROMOTION
-- =============================================

CREATE TABLE IF NOT EXISTS popup_promotion (
    popup_promotion_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_id INTEGER NOT NULL,
    cta_label TEXT,
    screen TEXT CHECK(screen IN ('home', 'browse', 'subcategory')),
    trigger_type TEXT NOT NULL CHECK(trigger_type IN ('screen_entry', 'scroll')),
    trigger_delay_seconds INTEGER NOT NULL DEFAULT 0,
    trigger_scroll_percent INTEGER NOT NULL DEFAULT 50,
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES image(image_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_popup_promotion_active
    ON popup_promotion(active, deleted_at);
CREATE INDEX IF NOT EXISTS idx_popup_promotion_schedule
    ON popup_promotion(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_popup_promotion_screen
    ON popup_promotion(screen);

-- =============================================
-- POPUP PROMOTION LISTING
-- =============================================

CREATE TABLE IF NOT EXISTS popup_promotion_listing (
    popup_promotion_id INTEGER NOT NULL,
    product_list_id INTEGER NOT NULL,
    display_order TEXT DEFAULT '0',
    PRIMARY KEY (popup_promotion_id, product_list_id),
    FOREIGN KEY (popup_promotion_id)
        REFERENCES popup_promotion(popup_promotion_id) ON DELETE CASCADE,
    FOREIGN KEY (product_list_id)
        REFERENCES product_list(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_popup_promotion_listing_promo
    ON popup_promotion_listing(popup_promotion_id);

-- =============================================
-- ANNOUNCEMENT TEXT
-- =============================================

CREATE TABLE IF NOT EXISTS announcement_text (
    announcement_id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    display_order TEXT DEFAULT '0',
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_announcement_active ON announcement_text(is_active, deleted_at, display_order);
CREATE INDEX IF NOT EXISTS idx_announcement_text_created_by ON announcement_text(created_by);

-- =============================================
-- PROMOTION PUSH
-- =============================================

CREATE TABLE IF NOT EXISTS promotion_push (
    promotion_push_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    listing_id INTEGER,
    device_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT,
    deleted_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_promotion_push_created_at ON promotion_push(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotion_push_deleted_at ON promotion_push(deleted_at);

-- =============================================
-- APP SETTING
-- =============================================

CREATE TABLE IF NOT EXISTS app_setting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL,
    value TEXT,
    updated_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_setting_key ON app_setting(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_setting_updated_by ON app_setting(updated_by);

-- =============================================
-- LOCATION: STATE / REGION
-- =============================================

CREATE TABLE IF NOT EXISTS state_region (
    state_region_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_my TEXT,
    type TEXT NOT NULL CHECK(type IN ('state', 'region', 'union_territory')),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_state_region_name ON state_region(name);
CREATE INDEX IF NOT EXISTS idx_state_region_type ON state_region(type);
CREATE INDEX IF NOT EXISTS idx_state_region_created_by ON state_region(created_by);

-- =============================================
-- LOCATION: DISTRICT
-- =============================================

CREATE TABLE IF NOT EXISTS district (
    district_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_my TEXT,
    state_region_id INTEGER NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (state_region_id) REFERENCES state_region(state_region_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_district_name_state ON district(name, state_region_id);
CREATE INDEX IF NOT EXISTS idx_district_state_region ON district(state_region_id);
CREATE INDEX IF NOT EXISTS idx_district_created_by ON district(created_by);

-- =============================================
-- LOCATION: TOWNSHIP
-- =============================================

CREATE TABLE IF NOT EXISTS township (
    township_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_my TEXT,
    district_id INTEGER NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (district_id) REFERENCES district(district_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_township_name_district ON township(name, district_id);
CREATE INDEX IF NOT EXISTS idx_township_district ON township(district_id);
CREATE INDEX IF NOT EXISTS idx_township_created_by ON township(created_by);

-- =============================================
-- PRODUCT BRAND
-- =============================================

CREATE TABLE IF NOT EXISTS product_brand (
    brand_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_brand_name ON product_brand(name);
CREATE INDEX IF NOT EXISTS idx_product_brand_created_by ON product_brand(created_by);

-- =============================================
-- EQUIPMENT MAIN CATEGORY
-- =============================================

CREATE TABLE IF NOT EXISTS equipment_main_category (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT,
    display_order TEXT DEFAULT '0',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_main_category_name ON equipment_main_category(name);
CREATE INDEX IF NOT EXISTS idx_equipment_main_category_created_by ON equipment_main_category(created_by);

-- =============================================
-- EQUIPMENT SUB CATEGORY
-- =============================================

CREATE TABLE IF NOT EXISTS equipment_sub_category (
    sub_category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    image_url TEXT,
    display_order TEXT DEFAULT '0',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (category_id) REFERENCES equipment_main_category(category_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_sub_category_name_per_main ON equipment_sub_category(category_id, name);
CREATE INDEX IF NOT EXISTS idx_equipment_sub_category_main ON equipment_sub_category(category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_sub_category_created_by ON equipment_sub_category(created_by);

-- =============================================
-- EQUIPMENT MODEL
-- =============================================

CREATE TABLE IF NOT EXISTS equipment_model (
    model_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand_id INTEGER,
    sub_category_id INTEGER NOT NULL,
    pdf_url TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (sub_category_id) REFERENCES equipment_sub_category(sub_category_id) ON DELETE RESTRICT,
    FOREIGN KEY (brand_id) REFERENCES product_brand(brand_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_equipment_model_sub_category ON equipment_model(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_model_brand ON equipment_model(brand_id);
CREATE INDEX IF NOT EXISTS idx_equipment_model_created_by ON equipment_model(created_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_model_name ON equipment_model(name);

-- =============================================
-- EQUIPMENT SUB CATEGORY BRAND
-- =============================================

CREATE TABLE IF NOT EXISTS equipment_sub_category_brand (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub_category_id INTEGER NOT NULL,
    brand_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (sub_category_id) REFERENCES equipment_sub_category(sub_category_id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES product_brand(brand_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_sub_category_brand_unique ON equipment_sub_category_brand(sub_category_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_equipment_sub_category_brand_sub ON equipment_sub_category_brand(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_equipment_sub_category_brand_brand ON equipment_sub_category_brand(brand_id);
CREATE INDEX IF NOT EXISTS idx_equipment_sub_category_brand_created_by ON equipment_sub_category_brand(created_by);

-- =============================================
-- ATTACHMENT CATEGORY
-- =============================================

CREATE TABLE IF NOT EXISTS attachment_category (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT,
    display_order TEXT DEFAULT '0',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attachment_category_name ON attachment_category(name);
CREATE INDEX IF NOT EXISTS idx_attachment_category_created_by ON attachment_category(created_by);

-- =============================================
-- ATTACHMENT MODEL
-- =============================================

CREATE TABLE IF NOT EXISTS attachment_model (
    model_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand_id INTEGER,
    category_id INTEGER NOT NULL,
    pdf_url TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (category_id) REFERENCES attachment_category(category_id) ON DELETE RESTRICT,
    FOREIGN KEY (brand_id) REFERENCES product_brand(brand_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attachment_model_name ON attachment_model(name);
CREATE INDEX IF NOT EXISTS idx_attachment_model_category ON attachment_model(category_id);
CREATE INDEX IF NOT EXISTS idx_attachment_model_brand ON attachment_model(brand_id);
CREATE INDEX IF NOT EXISTS idx_attachment_model_created_by ON attachment_model(created_by);


-- =============================================
-- ATTACHMENT CATEGORY BRAND
-- =============================================

CREATE TABLE IF NOT EXISTS attachment_category_brand (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    brand_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (category_id) REFERENCES attachment_category(category_id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES product_brand(brand_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attachment_category_brand_unique ON attachment_category_brand(category_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_attachment_category_brand_category ON attachment_category_brand(category_id);
CREATE INDEX IF NOT EXISTS idx_attachment_category_brand_brand ON attachment_category_brand(brand_id);
CREATE INDEX IF NOT EXISTS idx_attachment_category_brand_created_by ON attachment_category_brand(created_by);

-- =============================================
-- PRODUCT LIST
-- =============================================

CREATE TABLE IF NOT EXISTS product_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    custom_id_suffix TEXT,
    partner_id INTEGER,
    equipment_model_id INTEGER,
    attachment_model_id INTEGER,
    custom_fields TEXT,
    description TEXT,
    thumbnail_url TEXT,
    thumbnail_sm_url TEXT,
    thumbnail_blurhash TEXT,
    focal_x REAL NOT NULL DEFAULT 0.5,
    focal_y REAL NOT NULL DEFAULT 0.5,
    township_id INTEGER,
    hide_partner INTEGER DEFAULT 0,
    is_draft INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    hide_address INTEGER NOT NULL DEFAULT 0,
    hide_state_region INTEGER NOT NULL DEFAULT 0,
    hide_district INTEGER NOT NULL DEFAULT 0,
    hide_township INTEGER NOT NULL DEFAULT 0,
    address TEXT DEFAULT NULL,
    FOREIGN KEY (partner_id) REFERENCES partner(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_model_id) REFERENCES equipment_model(model_id) ON DELETE RESTRICT,
    FOREIGN KEY (attachment_model_id) REFERENCES attachment_model(model_id) ON DELETE RESTRICT,
    FOREIGN KEY (township_id) REFERENCES township(township_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL,
    CHECK (
        is_draft = 1 OR
        (
            (equipment_model_id IS NOT NULL AND attachment_model_id IS NULL) OR
            (equipment_model_id IS NULL AND attachment_model_id IS NOT NULL)
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_product_list_partner ON product_list(partner_id);
CREATE INDEX IF NOT EXISTS idx_product_list_equipment_model ON product_list(equipment_model_id);
CREATE INDEX IF NOT EXISTS idx_product_list_attachment_model ON product_list(attachment_model_id);
CREATE INDEX IF NOT EXISTS idx_product_list_township ON product_list(township_id);
CREATE INDEX IF NOT EXISTS idx_product_list_created_by ON product_list(created_by);
CREATE INDEX IF NOT EXISTS idx_product_list_active ON product_list(deleted_at, is_draft);
CREATE INDEX IF NOT EXISTS idx_product_list_drafts ON product_list(created_by, is_draft, deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_list_custom_id_suffix ON product_list(custom_id_suffix);

-- =============================================
-- TEMPLATE
-- =============================================


CREATE TABLE IF NOT EXISTS custom_field_template (
    template_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    fields TEXT NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_field_template_name 
    ON custom_field_template(name);
-- =============================================
-- PRODUCT IMAGE
-- =============================================

CREATE TABLE IF NOT EXISTS product_image (
    image_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_list_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    thumb_url TEXT,
    blurhash TEXT,
    focal_x REAL NOT NULL DEFAULT 0.5,
    focal_y REAL NOT NULL DEFAULT 0.5,
    display_order TEXT DEFAULT '0',
    uploaded_by INTEGER,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_list_id) REFERENCES product_list(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_image_product ON product_image(product_list_id);
CREATE INDEX IF NOT EXISTS idx_product_image_uploaded_by ON product_image(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_product_image_active_list ON product_image(product_list_id, active, display_order);

-- =============================================
-- SALE LISTING
-- =============================================

CREATE TABLE IF NOT EXISTS sale_listing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_list_id INTEGER NOT NULL,
    condition_type_id INTEGER,
    mmk_price INTEGER,
    usd_price INTEGER,
    hide_price INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    is_sold_out INTEGER DEFAULT 0,
    display_currency TEXT DEFAULT 'MMK',
    use_system_rate INTEGER DEFAULT 1,
    rate_to_usd REAL,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    approve_status_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    display_order TEXT DEFAULT '0',
    FOREIGN KEY (product_list_id) REFERENCES product_list(id) ON DELETE CASCADE,
    FOREIGN KEY (condition_type_id) REFERENCES condition_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES admin_user(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approve_status_id) REFERENCES approval_status_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_listing_product_list ON sale_listing(product_list_id);
CREATE INDEX IF NOT EXISTS idx_sale_listing_condition_type ON sale_listing(condition_type_id);
CREATE INDEX IF NOT EXISTS idx_sale_listing_approve_status ON sale_listing(approve_status_id);
CREATE INDEX IF NOT EXISTS idx_sale_listing_active ON sale_listing(deleted_at, is_hidden, approve_status_id, display_order);
CREATE INDEX IF NOT EXISTS idx_sale_listing_approved_by ON sale_listing(approved_by);
CREATE INDEX IF NOT EXISTS idx_sale_listing_created_by ON sale_listing(created_by);
CREATE INDEX IF NOT EXISTS idx_sale_listing_created_at ON sale_listing(created_at);

-- =============================================
-- RENT LISTING
-- =============================================

CREATE TABLE IF NOT EXISTS rent_listing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_list_id INTEGER NOT NULL,
    mmk_price INTEGER,
    usd_price INTEGER,
    hide_price INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    is_rented INTEGER DEFAULT 0,
    display_currency TEXT DEFAULT 'MMK',
    use_system_rate INTEGER DEFAULT 1,
    rate_to_usd REAL,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    approve_status_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    display_order TEXT DEFAULT '0',
    rental_unit TEXT DEFAULT 'per_day',
    FOREIGN KEY (product_list_id) REFERENCES product_list(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES admin_user(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approve_status_id) REFERENCES approval_status_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rent_listing_product_list ON rent_listing(product_list_id);
CREATE INDEX IF NOT EXISTS idx_rent_listing_is_rented ON rent_listing(is_rented);
CREATE INDEX IF NOT EXISTS idx_rent_listing_approve_status ON rent_listing(approve_status_id);
CREATE INDEX IF NOT EXISTS idx_rent_listing_active ON rent_listing(deleted_at, is_hidden, approve_status_id, display_order);
CREATE INDEX IF NOT EXISTS idx_rent_listing_approved_by ON rent_listing(approved_by);
CREATE INDEX IF NOT EXISTS idx_rent_listing_created_by ON rent_listing(created_by);
CREATE INDEX IF NOT EXISTS idx_rent_listing_created_at ON rent_listing(created_at);

-- =============================================
-- FEATURED LISTING
-- =============================================

CREATE TABLE IF NOT EXISTS featured_listing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_listing_id INTEGER,
    rent_listing_id INTEGER,
    display_order TEXT DEFAULT '0',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_listing_id) REFERENCES sale_listing(id) ON DELETE CASCADE,
    FOREIGN KEY (rent_listing_id) REFERENCES rent_listing(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL,
    CHECK (
        (sale_listing_id IS NOT NULL AND rent_listing_id IS NULL) OR
        (sale_listing_id IS NULL AND rent_listing_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_featured_listing_sale ON featured_listing(sale_listing_id);
CREATE INDEX IF NOT EXISTS idx_featured_listing_rent ON featured_listing(rent_listing_id);
CREATE INDEX IF NOT EXISTS idx_featured_listing_display_order ON featured_listing(display_order);
CREATE INDEX IF NOT EXISTS idx_featured_listing_created_by ON featured_listing(created_by);

-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATION
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notification (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_id    INTEGER NOT NULL,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    message         TEXT,
    reference_type  TEXT,
    reference_id    INTEGER,
    action_url      TEXT,
    is_read         INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (recipient_id) REFERENCES admin_user(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_recipient ON notification(recipient_id, is_read, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- USER NOTIFICATION (mobile app inbox)
-- ════════════════════════════════════════════════════════════════════════════
-- Per-user notification inbox used by the mobile app. Separate from
-- `notification` (which is the admin inbox keyed by admin_user). Written by
-- the admin portal via src/lib/services/user-notification.ts and read by the
-- mobile worker (cloudflare-worker-app-rest-api-dev/src/routes/notifications.ts).

CREATE TABLE IF NOT EXISTS user_notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_user_id    INTEGER NOT NULL,
    type           TEXT NOT NULL CHECK(type IN ('chat_reply', 'promotion', 'partner_approved', 'partner_rejected')),
    title          TEXT NOT NULL,
    body           TEXT,
    image_url      TEXT,
    reference_type TEXT,
    reference_id   INTEGER,
    action_url     TEXT,
    is_read        INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
    read_at        TIMESTAMP,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_notification_inbox ON user_notification(app_user_id, is_read, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- SAVED ITEM / BOOKMARKS (mobile app)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS saved_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_user_id INTEGER NOT NULL,
    product_list_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_list_id) REFERENCES product_list(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_item_unique ON saved_item(app_user_id, product_list_id);
CREATE INDEX IF NOT EXISTS idx_saved_item_user ON saved_item(app_user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- TRASH METADATA (soft-delete tracking)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trash_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    entity_table TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    file_keys TEXT,
    related_data TEXT,
    batch_id TEXT,
    deleted_by INTEGER NOT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (deleted_by) REFERENCES admin_user(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trash_metadata_entity ON trash_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_trash_metadata_batch ON trash_metadata(batch_id);
CREATE INDEX IF NOT EXISTS idx_trash_metadata_expires ON trash_metadata(expires_at);
CREATE INDEX IF NOT EXISTS idx_trash_metadata_deleted_by ON trash_metadata(deleted_by);

-- ─── Push Notification Device Tokens ─────────────────────────────────────────
CREATE TABLE device_token (
    device_token_id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    device_id TEXT NOT NULL,
    app_user_id INTEGER,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_device_token_token ON device_token(token);
CREATE INDEX idx_device_token_user ON device_token(app_user_id);
CREATE INDEX idx_device_token_device ON device_token(device_id);


-- ─── App Feedback (Help & Support) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_feedback (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    app_user_id  INTEGER,                 -- nullable: anonymous feedback allowed
    message      TEXT NOT NULL,
    platform     TEXT CHECK (platform IS NULL OR platform IN ('android', 'ios', 'web')),
    app_version  TEXT,
    -- Salted SHA-256 of the submitter's IP (never the raw IP). Used by the
    -- app worker for anti-spam: per-IP hourly cap + duplicate suppression.
    ip_hash      TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_app_feedback_created ON app_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_feedback_user    ON app_feedback(app_user_id);
-- Supports the anti-spam hourly-count and duplicate-message lookups.
CREATE INDEX IF NOT EXISTS idx_app_feedback_ip      ON app_feedback(ip_hash, created_at);
