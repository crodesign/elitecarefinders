-- Add SEO & Metadata fields to homes, facilities, and posts tables
-- All fields nullable so existing records continue working with auto-generated defaults

ALTER TABLE homes
    ADD COLUMN IF NOT EXISTS meta_title         text,
    ADD COLUMN IF NOT EXISTS meta_description   text,
    ADD COLUMN IF NOT EXISTS canonical_url      text,
    ADD COLUMN IF NOT EXISTS indexable          boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS og_title           text,
    ADD COLUMN IF NOT EXISTS og_description     text,
    ADD COLUMN IF NOT EXISTS og_image_url       text,
    ADD COLUMN IF NOT EXISTS schema_json        jsonb;

ALTER TABLE facilities
    ADD COLUMN IF NOT EXISTS meta_title         text,
    ADD COLUMN IF NOT EXISTS meta_description   text,
    ADD COLUMN IF NOT EXISTS canonical_url      text,
    ADD COLUMN IF NOT EXISTS indexable          boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS og_title           text,
    ADD COLUMN IF NOT EXISTS og_description     text,
    ADD COLUMN IF NOT EXISTS og_image_url       text,
    ADD COLUMN IF NOT EXISTS schema_json        jsonb;

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS meta_title         text,
    ADD COLUMN IF NOT EXISTS meta_description   text,
    ADD COLUMN IF NOT EXISTS canonical_url      text,
    ADD COLUMN IF NOT EXISTS indexable          boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS og_title           text,
    ADD COLUMN IF NOT EXISTS og_description     text,
    ADD COLUMN IF NOT EXISTS og_image_url       text,
    ADD COLUMN IF NOT EXISTS schema_json        jsonb;
