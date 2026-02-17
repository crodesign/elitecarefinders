-- Fix RLS policies on media_items to prevent "more than one row returned" error
-- This script drops all existing policies on media_items and recreates them with safe defaults.

-- 1. Enable RLS
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on media_items
-- We use a DO block to find and drop them dynamically since we don't know the exact names
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'media_items' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON media_items', pol.policyname);
    END LOOP;
END $$;

-- 3. Create new, safe policies

-- Public Read Access
-- Allow everyone to view media items (needed for displaying images on the site)
CREATE POLICY "Public read access" 
ON media_items FOR SELECT 
USING (true);

-- Authenticated Insert
-- Allow authenticated users to upload/create media items
CREATE POLICY "Authenticated insert" 
ON media_items FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Authenticated Update
-- Allow authenticated users to update media items (e.g. captions, alt text)
-- Ideally we would restrict this to owners, but since created_by is missing, 
-- we allow all authenticated users for now to unblock functionality.
CREATE POLICY "Authenticated update" 
ON media_items FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Authenticated Delete
-- Allow authenticated users to delete media items
CREATE POLICY "Authenticated delete" 
ON media_items FOR DELETE 
TO authenticated 
USING (true);

-- 4. Check media_folders RLS as well (just in case)
-- We won't drop them blindly, but we'll ensure basic access exists
-- (This part is commented out to focus on the known error source first)
-- ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read folders" ON media_folders FOR SELECT USING (true);
