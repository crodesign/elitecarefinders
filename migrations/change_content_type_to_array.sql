-- Rename content_type to content_types
ALTER TABLE taxonomies 
RENAME COLUMN content_type TO content_types;

-- Change type from TEXT to TEXT[]
-- Using string_to_array to convert existing single values to single-element arrays
ALTER TABLE taxonomies 
ALTER COLUMN content_types TYPE text[] 
USING CASE 
    WHEN content_types IS NULL THEN '{}'::text[]
    ELSE string_to_array(content_types, ',') 
END;

-- Update index
DROP INDEX IF EXISTS idx_taxonomies_content_type;
CREATE INDEX IF NOT EXISTS idx_taxonomies_content_types ON taxonomies USING GIN(content_types);

-- Comment
COMMENT ON COLUMN taxonomies.content_types IS 'Array of associated content types: homes, facilities, reviews, blog';
