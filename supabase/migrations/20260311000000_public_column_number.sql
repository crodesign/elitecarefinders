-- Add public_column_number to room_field_categories
-- This is independent of column_number (used by admin Detail Fields page).
-- Controls which column each category renders in on the public-facing pages.
-- NULL = fall back to column_number for backwards compatibility.

ALTER TABLE public.room_field_categories
    ADD COLUMN IF NOT EXISTS public_column_number integer DEFAULT NULL;
