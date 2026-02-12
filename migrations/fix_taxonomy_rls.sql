-- Migration: Fix Taxonomy and Taxonomy Entries RLS for Authenticated Users
-- This ensures authenticated users can access taxonomies and taxonomy_entries

-- ============================================================================
-- 1. TAXONOMIES TABLE - Add authenticated user policies
-- ============================================================================

-- Enable RLS on taxonomies if not already enabled
ALTER TABLE taxonomies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read taxonomies" ON taxonomies;
DROP POLICY IF EXISTS "Super admins can modify taxonomies" ON taxonomies;

-- Allow authenticated users to read all taxonomies
CREATE POLICY "Authenticated users can read taxonomies"
ON taxonomies FOR SELECT
TO authenticated
USING (true);

-- Only super_admin can modify taxonomies
CREATE POLICY "Super admins can modify taxonomies"
ON taxonomies FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
);

-- ============================================================================
-- 2. TAXONOMY_ENTRIES TABLE - Add authenticated user policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read taxonomy_entries" ON taxonomy_entries;
DROP POLICY IF EXISTS "Super admins can modify taxonomy_entries" ON taxonomy_entries;

-- Allow authenticated users to read all taxonomy entries
CREATE POLICY "Authenticated users can read taxonomy_entries"
ON taxonomy_entries FOR SELECT
TO authenticated
USING (true);

-- Only super_admin can modify taxonomy entries
CREATE POLICY "Super admins can modify taxonomy_entries"
ON taxonomy_entries FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
);

-- Add helpful comments
COMMENT ON POLICY "Authenticated users can read taxonomies" ON taxonomies IS 'All authenticated users need to read taxonomies for location selectors, etc.';
COMMENT ON POLICY "Authenticated users can read taxonomy_entries" ON taxonomy_entries IS 'All authenticated users need to read taxonomy entries for location selectors, etc.';

