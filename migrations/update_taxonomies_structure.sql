-- Migration: Update taxonomies table structure
-- This migration changes from the old model (type, name, slug) 
-- to the new model (singular_name, plural_name, slug)

-- Step 1: Add new columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'taxonomies' AND column_name = 'singular_name') THEN
        ALTER TABLE taxonomies ADD COLUMN singular_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'taxonomies' AND column_name = 'plural_name') THEN
        ALTER TABLE taxonomies ADD COLUMN plural_name TEXT;
    END IF;
END $$;

-- Step 2: Migrate data from old columns to new columns
-- singular_name gets the 'name' value, plural_name gets it with 's' suffix if not already ending in 's'
UPDATE taxonomies 
SET 
    singular_name = COALESCE(name, type),
    plural_name = CASE 
        WHEN name IS NOT NULL AND name NOT LIKE '%s' THEN name || 's'
        WHEN name IS NOT NULL THEN name
        WHEN type IS NOT NULL AND type NOT LIKE '%s' THEN type || 's'
        ELSE type
    END
WHERE singular_name IS NULL;

-- Step 3: Make new columns NOT NULL after migration
ALTER TABLE taxonomies ALTER COLUMN singular_name SET NOT NULL;
ALTER TABLE taxonomies ALTER COLUMN plural_name SET NOT NULL;

-- Step 4: Drop old columns (optional - comment out if you want to keep them for backup)
-- ALTER TABLE taxonomies DROP COLUMN IF EXISTS name;
-- ALTER TABLE taxonomies DROP COLUMN IF EXISTS type;
-- ALTER TABLE taxonomies DROP COLUMN IF EXISTS description;

-- Note: Run this in Supabase SQL Editor
-- After verifying data is correct, you can uncomment Step 4 to drop old columns
