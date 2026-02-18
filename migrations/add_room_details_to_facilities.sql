-- Add room_details column to facilities table (matches homes table structure)
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS room_details JSONB DEFAULT '{}'::jsonb;
