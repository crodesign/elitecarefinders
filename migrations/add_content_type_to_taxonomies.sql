-- Add content_type column to taxonomies table
ALTER TABLE taxonomies 
ADD COLUMN IF NOT EXISTS content_type TEXT;

-- Create an index for faster lookups by content type (optional but good for sidebar performance)
CREATE INDEX IF NOT EXISTS idx_taxonomies_content_type ON taxonomies(content_type);

-- Comment to document allowed values
COMMENT ON COLUMN taxonomies.content_type IS 'Associated content type: homes, facilities, reviews, blog';
