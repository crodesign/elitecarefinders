-- Add excerpt column to homes and facilities tables
ALTER TABLE homes ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS excerpt TEXT;
