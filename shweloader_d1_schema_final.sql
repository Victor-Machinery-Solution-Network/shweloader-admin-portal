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

CREATE TABLE IF NOT EXISTS enquiry_status_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status_name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_enquiry_status_type_name ON enquiry_status_type(status_name);

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

-- =============================================
-- FEATURES & PERMISSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS feature (
    feature_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_name ON feature(name);

CREATE TABLE IF NOT EXISTS permission (
    permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permission_name ON permission(name);

CREATE TABLE IF NOT EXISTS feature_permission (
    feature_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (feature_id, permission_id),
    FOREIGN KEY (feature_id) REFERENCES feature(feature_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permission(permission_id) ON DELETE CASCADE
);

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    permission_id INTEGER NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES role(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permission(permission_id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_role_permission_role ON role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_permission ON role_permission(permission_id);
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
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_type_name ON business_type(name);
CREATE INDEX IF NOT EXISTS idx_business_type_created_by ON business_type(created_by);

-- =============================================
-- CUSTOMER
-- =============================================

CREATE TABLE IF NOT EXISTS customer (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    is_verified INTEGER DEFAULT 0,
    company_name TEXT,
    office_address TEXT,
    business_type_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_type_id) REFERENCES business_type(business_type_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_username ON customer(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_email ON customer(email);
CREATE INDEX IF NOT EXISTS idx_customer_business_type ON customer(business_type_id);
CREATE INDEX IF NOT EXISTS idx_customer_is_verified ON customer(is_verified);
CREATE INDEX IF NOT EXISTS idx_customer_company_name ON customer(company_name);

-- =============================================
-- PARTNER
-- =============================================

CREATE TABLE IF NOT EXISTS partner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    partner_type_id INTEGER,
    status_id INTEGER,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER,
    rejection_reason TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (partner_type_id) REFERENCES partner_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (status_id) REFERENCES partner_status_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_partner_customer ON partner(customer_id);
CREATE INDEX IF NOT EXISTS idx_partner_type ON partner(partner_type_id);
CREATE INDEX IF NOT EXISTS idx_partner_status ON partner(status_id);
CREATE INDEX IF NOT EXISTS idx_partner_reviewed_by ON partner(reviewed_by);

-- =============================================
-- ENQUIRY
-- =============================================

CREATE TABLE IF NOT EXISTS enquiry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_listing_id INTEGER,
    rent_listing_id INTEGER,
    customer_id INTEGER,
    message TEXT,
    enquiry_status_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (sale_listing_id) REFERENCES sale_listing(id) ON DELETE CASCADE,
    FOREIGN KEY (rent_listing_id) REFERENCES rent_listing(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (enquiry_status_id) REFERENCES enquiry_status_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (updated_by) REFERENCES admin_user(user_id) ON DELETE SET NULL,
    CHECK (
        (sale_listing_id IS NOT NULL AND rent_listing_id IS NULL) OR
        (sale_listing_id IS NULL AND rent_listing_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_enquiry_sale_listing ON enquiry(sale_listing_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_rent_listing ON enquiry(rent_listing_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_customer ON enquiry(customer_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_status ON enquiry(enquiry_status_id);
CREATE INDEX IF NOT EXISTS idx_enquiry_updated_by ON enquiry(updated_by);
CREATE INDEX IF NOT EXISTS idx_enquiry_created_at ON enquiry(created_at);

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
-- ARTICLE CATEGORY
-- =============================================

CREATE TABLE IF NOT EXISTS article_category (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
CREATE INDEX IF NOT EXISTS idx_article_created_at ON article(created_at);

-- =============================================
-- IMAGE
-- =============================================

CREATE TABLE IF NOT EXISTS image (
    image_id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_carousel_image_display_order ON carousel_image(display_order);
CREATE INDEX IF NOT EXISTS idx_carousel_image_active ON carousel_image(active);

-- =============================================
-- ANNOUNCEMENT TEXT
-- =============================================

CREATE TABLE IF NOT EXISTS announcement_text (
    announcement_id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_order TEXT DEFAULT '0',
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_announcement_text_is_active ON announcement_text(is_active);
CREATE INDEX IF NOT EXISTS idx_announcement_text_display_order ON announcement_text(display_order);
CREATE INDEX IF NOT EXISTS idx_announcement_text_created_by ON announcement_text(created_by);

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
-- LOCATION
-- =============================================

CREATE TABLE IF NOT EXISTS location (
    location_id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_location_city_name ON location(city_name);
CREATE INDEX IF NOT EXISTS idx_location_created_by ON location(created_by);

-- =============================================
-- PRODUCT BRAND
-- =============================================

CREATE TABLE IF NOT EXISTS product_brand (
    brand_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    partner_id INTEGER NOT NULL,
    equipment_model_id INTEGER,
    attachment_model_id INTEGER,
    custom_fields TEXT,
    description TEXT,
    thumbnail_url TEXT,
    location_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partner(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_model_id) REFERENCES equipment_model(model_id) ON DELETE RESTRICT,
    FOREIGN KEY (attachment_model_id) REFERENCES attachment_model(model_id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES location(location_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL,
    CHECK (
        (equipment_model_id IS NOT NULL AND attachment_model_id IS NULL) OR
        (equipment_model_id IS NULL AND attachment_model_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_product_list_partner ON product_list(partner_id);
CREATE INDEX IF NOT EXISTS idx_product_list_equipment_model ON product_list(equipment_model_id);
CREATE INDEX IF NOT EXISTS idx_product_list_attachment_model ON product_list(attachment_model_id);
CREATE INDEX IF NOT EXISTS idx_product_list_location ON product_list(location_id);
CREATE INDEX IF NOT EXISTS idx_product_list_created_by ON product_list(created_by);

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
    display_order TEXT DEFAULT '0',
    uploaded_by INTEGER,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_list_id) REFERENCES product_list(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_image_product ON product_image(product_list_id);
CREATE INDEX IF NOT EXISTS idx_product_image_uploaded_by ON product_image(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_product_image_active ON product_image(active);
CREATE INDEX IF NOT EXISTS idx_product_image_display_order ON product_image(display_order);

-- =============================================
-- SALE LISTING
-- =============================================

CREATE TABLE IF NOT EXISTS sale_listing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    custom_id TEXT,
    product_list_id INTEGER NOT NULL,
    condition TEXT,
    mmk_price INTEGER,
    usd_price INTEGER,
    is_hidden INTEGER DEFAULT 0,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    approve_status_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_list_id) REFERENCES product_list(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES admin_user(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approve_status_id) REFERENCES approval_status_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_listing_product_list ON sale_listing(product_list_id);
CREATE INDEX IF NOT EXISTS idx_sale_listing_is_hidden ON sale_listing(is_hidden);
CREATE INDEX IF NOT EXISTS idx_sale_listing_approve_status ON sale_listing(approve_status_id);
CREATE INDEX IF NOT EXISTS idx_sale_listing_approved_by ON sale_listing(approved_by);
CREATE INDEX IF NOT EXISTS idx_sale_listing_created_by ON sale_listing(created_by);
CREATE INDEX IF NOT EXISTS idx_sale_listing_created_at ON sale_listing(created_at);

-- =============================================
-- RENT LISTING
-- =============================================

CREATE TABLE IF NOT EXISTS rent_listing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    custom_id TEXT,
    product_list_id INTEGER NOT NULL,
    mmk_price INTEGER,
    usd_price INTEGER,
    is_hidden INTEGER DEFAULT 0,
    approved_by INTEGER,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    approve_status_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_list_id) REFERENCES product_list(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES admin_user(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approve_status_id) REFERENCES approval_status_type(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rent_listing_product_list ON rent_listing(product_list_id);
CREATE INDEX IF NOT EXISTS idx_rent_listing_is_hidden ON rent_listing(is_hidden);
CREATE INDEX IF NOT EXISTS idx_rent_listing_approve_status ON rent_listing(approve_status_id);
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
