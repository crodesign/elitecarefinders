-- Add status column to homes table
ALTER TABLE homes 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));

-- Add taxonomy_entry_ids column to homes table to store selected taxonomy terms
ALTER TABLE homes 
ADD COLUMN IF NOT EXISTS taxonomy_entry_ids UUID[] DEFAULT '{}';

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS homes_status_idx ON homes (status);

-- Create index for faster filtering by taxonomy entries (using GIN for array)
CREATE INDEX IF NOT EXISTS homes_taxonomy_entry_ids_idx ON homes USING GIN (taxonomy_entry_ids);
