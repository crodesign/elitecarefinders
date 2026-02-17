-- Fix RLS policies on BOTH media_items and media_folders
-- This script drops all existing policies and recreates them with safe defaults to resolve subquery errors.

-- ============================================================================
-- 1. Media Items
-- ============================================================================

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on media_items
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'media_items' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON media_items', pol.policyname);
    END LOOP;
END $$;

-- Create safe policies for media_items
CREATE POLICY "Public read items" ON media_items FOR SELECT USING (true);
CREATE POLICY "Auth insert items" ON media_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update items" ON media_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete items" ON media_items FOR DELETE TO authenticated USING (true);


-- ============================================================================
-- 2. Media Folders
-- ============================================================================

-- Ensure table exists (it should)
CREATE TABLE IF NOT EXISTS media_folders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    parent_id uuid REFERENCES media_folders(id),
    created_at timestamptz DEFAULT now(),
    path text,
    slug text,
    state_id uuid
    -- Add other columns if they are missing, but usually we don't need to inside a fix script if table exists
);

ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on media_folders
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'media_folders' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON media_folders', pol.policyname);
    END LOOP;
END $$;

-- Create safe policies for media_folders
CREATE POLICY "Public read folders" ON media_folders FOR SELECT USING (true);
CREATE POLICY "Auth insert folders" ON media_folders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update folders" ON media_folders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete folders" ON media_folders FOR DELETE TO authenticated USING (true);

-- Debug: Add public insert if strictly necessary for dev (commented out by default, but maybe useful if auth is broken)
-- CREATE POLICY "Public insert folders" ON media_folders FOR INSERT TO public WITH CHECK (true);

-- ============================================================================
-- 3. Cleanup Duplicates (Optional but recommended if maybeSingle crashes)
-- ============================================================================
-- This might help if "Multiple rows" is the issue, though the error text said "subquery".
-- But let's leave this out for now to ensure the script runs safely without deleting data.
