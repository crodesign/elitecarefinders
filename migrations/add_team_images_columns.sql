-- Add team_images array to homes table
ALTER TABLE homes ADD COLUMN IF NOT EXISTS team_images TEXT[] DEFAULT '{}'::text[];

-- Add team_images array to facilities table
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS team_images TEXT[] DEFAULT '{}'::text[];
