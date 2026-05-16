-- popup_promotion + junction tables for in-app popup ads
-- Spec: docs/superpowers/specs/2026-05-16-popup-promotions-design.md §5

CREATE TABLE IF NOT EXISTS popup_promotion (
    popup_promotion_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_id INTEGER NOT NULL,
    cta_label TEXT,
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

CREATE TABLE IF NOT EXISTS popup_promotion_screen (
    popup_promotion_id INTEGER NOT NULL,
    screen TEXT NOT NULL CHECK(screen IN ('home', 'browse', 'subcategory')),
    PRIMARY KEY (popup_promotion_id, screen),
    FOREIGN KEY (popup_promotion_id)
        REFERENCES popup_promotion(popup_promotion_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_popup_promotion_screen_screen
    ON popup_promotion_screen(screen);

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

-- RBAC feature row (display_order 26, right after `promotions`)
INSERT OR IGNORE INTO feature (name, group_name, display_order)
    VALUES ('popup_promotions', 'Content', 26);
