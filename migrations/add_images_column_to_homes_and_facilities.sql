-- Add images column to homes table
ALTER TABLE homes ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add images column to facilities table
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
