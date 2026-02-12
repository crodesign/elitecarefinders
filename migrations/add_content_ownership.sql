-- Migration: Add Content Ownership Tracking
-- This migration adds created_by columns and updates RLS policies for ownership-based access

-- ============================================================================
-- 1. ADD CREATED_BY COLUMNS
-- ============================================================================

-- Add created_by to track content ownership
ALTER TABLE homes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Check if media table exists before adding column
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'media') THEN
        ALTER TABLE media ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- ============================================================================
-- 2. BACKFILL EXISTING CONTENT
-- ============================================================================

-- Set existing content to be owned by Super Admin
-- You'll need to replace 'SUPER_ADMIN_USER_ID_HERE' with the actual UUID
-- Or run this separately after migration

-- UPDATE homes SET created_by = 'SUPER_ADMIN_USER_ID_HERE'::uuid WHERE created_by IS NULL;
-- UPDATE facilities SET created_by = 'SUPER_ADMIN_USER_ID_HERE'::uuid WHERE created_by IS NULL;
-- IF media table exists: UPDATE media SET created_by = 'SUPER_ADMIN_USER_ID_HERE'::uuid WHERE created_by IS NULL;

-- ============================================================================
-- 3. HELPER FUNCTION: Check if user can access content
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_content(content_creator_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role TEXT;
    creator_role TEXT;
BEGIN
    -- Get roles
    current_user_role := get_user_role(auth.uid());
    creator_role := get_user_role(content_creator_id);
    
    -- Super/System admins can access all content
    IF current_user_role IN ('super_admin', 'system_admin') THEN
        RETURN true;
    END IF;
    
    -- Users can access their own content
    IF auth.uid() = content_creator_id THEN
        RETURN true;
    END IF;
    
    -- Regional Managers can access content created by Local Users in their regions
    IF current_user_role = 'regional_manager' AND creator_role = 'local_user' THEN
        -- Check if Regional Manager and Local User share at least one location
        RETURN EXISTS (
            SELECT 1 
            FROM user_location_assignments rm_loc
            INNER JOIN user_location_assignments lu_loc ON rm_loc.location_id = lu_loc.location_id
            WHERE rm_loc.user_id = auth.uid() 
            AND lu_loc.user_id = content_creator_id
        );
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. UPDATE HOMES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies that we'll replace
DROP POLICY IF EXISTS "Authenticated users can insert homes" ON homes;
DROP POLICY IF EXISTS "Authenticated users can update homes" ON homes;
DROP POLICY IF EXISTS "Admins can delete homes" ON homes;

-- INSERT: Set created_by automatically
CREATE POLICY "Authenticated users can insert homes" ON homes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Set created_by to current user
        created_by = auth.uid()
        AND
        -- Must have proper role and location access
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'local_user')
                AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
            )
        )
    );

-- UPDATE: Can edit if you can access the content
CREATE POLICY "Users can update accessible homes" ON homes
    FOR UPDATE
    TO authenticated
    USING (
        can_access_content(created_by)
        AND
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'local_user')
                AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
            )
        )
    )
    WITH CHECK (
        -- created_by cannot be changed
        created_by = (SELECT created_by FROM homes WHERE id = homes.id)
        AND
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'local_user')
                AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
            )
        )
    );

-- DELETE: Only owners or admins can delete
CREATE POLICY "Users can delete own homes" ON homes
    FOR DELETE
    TO authenticated
    USING (
        -- Super/System admins can delete any
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
        OR
        -- Users can delete their own
        created_by = auth.uid()
    );

-- ============================================================================
-- 5. UPDATE FACILITIES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can insert facilities" ON facilities;
DROP POLICY IF EXISTS "Authenticated users can update facilities" ON facilities;
DROP POLICY IF EXISTS "Admins can delete facilities" ON facilities;

-- INSERT: Set created_by automatically
CREATE POLICY "Authenticated users can insert facilities" ON facilities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        created_by = auth.uid()
        AND
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'local_user')
                AND can_edit_by_location(auth.uid(), 
                    ARRAY(SELECT jsonb_array_elements_text(taxonomy_ids)::UUID)
                )
            )
        )
    );

-- UPDATE: Can edit if you can access the content
CREATE POLICY "Users can update accessible facilities" ON facilities
    FOR UPDATE
    TO authenticated
    USING (
        can_access_content(created_by)
        AND
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'local_user')
                AND can_edit_by_location(auth.uid(), 
                    ARRAY(SELECT jsonb_array_elements_text(taxonomy_ids)::UUID)
                )
            )
        )
    )
    WITH CHECK (
        created_by = (SELECT created_by FROM facilities WHERE id = facilities.id)
        AND
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'local_user')
                AND can_edit_by_location(auth.uid(), 
                    ARRAY(SELECT jsonb_array_elements_text(taxonomy_ids)::UUID)
                )
            )
        )
    );

-- DELETE: Only owners or admins can delete
CREATE POLICY "Users can delete own facilities" ON facilities
    FOR DELETE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
        OR
        created_by = auth.uid()
    );

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON COLUMN homes.created_by IS 'User who created this home listing. Determines ownership and access for non-admins.';
COMMENT ON COLUMN facilities.created_by IS 'User who created this facility. Determines ownership and access for non-admins.';
