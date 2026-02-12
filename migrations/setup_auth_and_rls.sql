-- Migration: Setup Authentication and Row Level Security
-- This migration creates user roles, location assignments, and RLS policies

-- ============================================================================
-- 1. CREATE USER ROLES TABLE
-- ============================================================================

-- Drop existing app_role enum if it exists (may conflict with our TEXT-based role field)
DROP TYPE IF EXISTS app_role CASCADE;

-- Drop user_roles table if it exists (for clean re-run)
DROP TABLE IF EXISTS user_roles CASCADE;

CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'system_admin', 'local_user')),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own role
CREATE POLICY "Users can view their own role" ON user_roles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: All authenticated users can read all roles (needed for admin checks)
CREATE POLICY "Authenticated users can view all roles" ON user_roles
    FOR SELECT
    TO authenticated
    USING (true);

-- Index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- ============================================================================
-- 2. CREATE USER LOCATION ASSIGNMENTS TABLE
-- ============================================================================

-- Drop user_location_assignments table if it exists (for clean re-run)
DROP TABLE IF EXISTS user_location_assignments CASCADE;

CREATE TABLE user_location_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES taxonomy_entries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, location_id)
);

-- Enable RLS on user_location_assignments
ALTER TABLE user_location_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own location assignments
CREATE POLICY "Users can view their own location assignments" ON user_location_assignments
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Admins can view all location assignments
CREATE POLICY "Admins can view all location assignments" ON user_location_assignments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'system_admin')
        )
    );

-- Index for faster location lookups
CREATE INDEX IF NOT EXISTS idx_user_location_assignments_user_id ON user_location_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_assignments_location_id ON user_location_assignments(location_id);

-- ============================================================================
-- 3. HELPER FUNCTION: Get User Role
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS TEXT AS $$
    SELECT role FROM user_roles WHERE user_id = uid LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- 4. HELPER FUNCTION: Check if user can edit home/facility by location
-- ============================================================================
CREATE OR REPLACE FUNCTION can_edit_by_location(uid UUID, location_ids UUID[])
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get user's role
    user_role := get_user_role(uid);
    
    -- Super admin and system admin can edit anything
    IF user_role IN ('super_admin', 'system_admin') THEN
        RETURN true;
    END IF;
    
    -- Local users can only edit if they have access to at least one of the locations
    IF user_role = 'local_user' THEN
        RETURN EXISTS (
            SELECT 1 
            FROM user_location_assignments ula
            WHERE ula.user_id = uid 
            AND ula.location_id = ANY(location_ids)
        );
    END IF;
    
    -- If no role or unrecognized role, deny access
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. UPDATE HOMES TABLE - Add location field if not exists
-- ============================================================================
-- Check if homes has a location field in taxonomy_entry_ids
-- If not, we'll need to track location separately or ensure it's in taxonomy_entry_ids

-- ============================================================================
-- 6. RLS POLICIES FOR HOMES TABLE
-- ============================================================================

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON homes;
DROP POLICY IF EXISTS "Allow public read access" ON homes;

-- Re-enable RLS on homes (in case it was disabled)
ALTER TABLE homes ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access to all homes
CREATE POLICY "Public can read all homes" ON homes
    FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert homes (will be restricted by location check)
CREATE POLICY "Authenticated users can insert homes" ON homes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Super/System admins can insert anything
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
        OR
        -- Local users can insert if they have access to at least one location in taxonomy_entry_ids
        (
            get_user_role(auth.uid()) = 'local_user'
            AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
        )
    );

-- Policy: Authenticated users can update homes
CREATE POLICY "Authenticated users can update homes" ON homes
    FOR UPDATE
    TO authenticated
    USING (
        -- Super/System admins can update anything
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
        OR
        -- Local users can update if they have access to at least one location
        (
            get_user_role(auth.uid()) = 'local_user'
            AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
        )
    )
    WITH CHECK (
        -- Same check for the new values
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
        OR
        (
            get_user_role(auth.uid()) = 'local_user'
            AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
        )
    );

-- Policy: Only super/system admins can delete homes
CREATE POLICY "Admins can delete homes" ON homes
    FOR DELETE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

-- ============================================================================
-- 7. RLS POLICIES FOR FACILITIES TABLE
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON facilities;
DROP POLICY IF EXISTS "Allow public read access" ON facilities;

-- Policy: Public read access to all facilities
CREATE POLICY "Public can read all facilities" ON facilities
    FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert facilities
CREATE POLICY "Authenticated users can insert facilities" ON facilities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
        OR
        (
            get_user_role(auth.uid()) = 'local_user'
            AND can_edit_by_location(auth.uid(), 
                ARRAY(SELECT jsonb_array_elements_text(taxonomy_ids)::UUID)
            )
        )
    );

-- Policy: Authenticated users can update facilities
CREATE POLICY "Authenticated users can update facilities" ON facilities
    FOR UPDATE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
        OR
        (
            get_user_role(auth.uid()) = 'local_user'
            AND can_edit_by_location(auth.uid(), 
                ARRAY(SELECT jsonb_array_elements_text(taxonomy_ids)::UUID)
            )
        )
    )
    WITH CHECK (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
        OR
        (
            get_user_role(auth.uid()) = 'local_user'
            AND can_edit_by_location(auth.uid(), 
                ARRAY(SELECT jsonb_array_elements_text(taxonomy_ids)::UUID)
            )
        )
    );

-- Policy: Only super/system admins can delete facilities
CREATE POLICY "Admins can delete facilities" ON facilities
    FOR DELETE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

-- ============================================================================
-- 8. RLS POLICIES FOR room_fixed_field_types
-- ============================================================================

-- Re-enable RLS (it was disabled in fix_icon_rls.sql)
ALTER TABLE room_fixed_field_types ENABLE ROW LEVEL SECURITY;

-- The existing policies are already good, they just weren't being enforced
-- Policies already exist:
-- - "Enable read access for authenticated users"
-- - "Enable insert/update for authenticated users"

-- ============================================================================
-- 9. SEED INITIAL USERS
-- ============================================================================
-- NOTE: This section creates the actual auth users using Supabase Auth
-- The passwords will be hashed automatically by Supabase

-- Create Super Admin user
-- Email: clients@crodesign.com
-- Password: Maunakea808!
-- This will need to be done via Supabase Auth API or Dashboard
-- We'll add a comment here as a reminder

-- Create System Admin user  
-- Email: r.gallego@elitecarefinders.com
-- Password: ECFWaikiki808!
-- This will need to be done via Supabase Auth API or Dashboard

-- The user_id values will be added to user_roles table after users are created
-- This can be done manually or via a separate script

COMMENT ON TABLE user_roles IS 'Stores user roles for RBAC. Super Admin: full access. System Admin: all data access except Settings. Local User: location-restricted access.';
COMMENT ON TABLE user_location_assignments IS 'Maps local users to specific locations (taxonomy_entries) they can manage.';
