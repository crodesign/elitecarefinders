-- Add promotion columns to homes table
ALTER TABLE homes 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_featured_video BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_home_of_month BOOLEAN DEFAULT false;

-- Create indexes for faster filtering by promotions (optional, but likely useful for landing pages)
CREATE INDEX IF NOT EXISTS homes_is_featured_idx ON homes (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS homes_is_home_of_month_idx ON homes (is_home_of_month) WHERE is_home_of_month = true;
