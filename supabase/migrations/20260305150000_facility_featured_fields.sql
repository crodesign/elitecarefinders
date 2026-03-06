-- Add featured/promotion fields to facilities table (mirrors homes table pattern)

ALTER TABLE public.facilities
    ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS has_featured_video boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_facility_of_month boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS featured_label text DEFAULT '',
    ADD COLUMN IF NOT EXISTS facility_of_month_description text DEFAULT '';
