-- Add sort_order to homes and facilities (used only for featured ordering)
ALTER TABLE homes ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Site-wide key/value settings (used for video sort order, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);
