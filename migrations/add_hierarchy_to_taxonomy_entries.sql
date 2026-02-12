-- Migration: Add hierarchy support to taxonomy_entries
-- Run this in Supabase SQL Editor

-- Add parent_id column for hierarchy (self-referencing foreign key)
ALTER TABLE taxonomy_entries 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES taxonomy_entries(id) ON DELETE CASCADE;

-- Add display_order for drag-drop reordering within siblings
ALTER TABLE taxonomy_entries 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Index for efficient parent lookups
CREATE INDEX IF NOT EXISTS idx_taxonomy_entries_parent_id ON taxonomy_entries(parent_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'taxonomy_entries' 
ORDER BY ordinal_position;
