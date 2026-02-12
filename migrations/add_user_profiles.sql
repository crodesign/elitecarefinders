-- Migration: Create User Profiles Table
-- This migration adds profile information for users

-- ============================================================================
-- 1. CREATE USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    photo_url TEXT,
    address JSONB, -- {street: string, city: string, state: string, zip: string}
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 2. ENABLE RLS
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'system_admin')
        )
    );

-- Policy: Regional Managers can view profiles of their local users
CREATE POLICY "Regional managers can view local user profiles" ON user_profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'regional_manager'
        )
        AND EXISTS (
            -- Check if the profile belongs to a local user in the same region
            SELECT 1 
            FROM user_location_assignments rm_loc
            INNER JOIN user_location_assignments lu_loc ON rm_loc.location_id = lu_loc.location_id
            WHERE rm_loc.user_id = auth.uid() 
            AND lu_loc.user_id = user_profiles.user_id
        )
    );

-- Policy: Admins and Regional Managers can insert profiles for users they create
CREATE POLICY "Authorized users can create profiles" ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'system_admin', 'regional_manager')
        )
    );

-- Policy: Admins and Regional Managers can update profiles
CREATE POLICY "Authorized users can update profiles" ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (
        -- Super/System admins can update anyone
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'system_admin')
        )
        OR
        -- Regional managers can update local users in their region
        (
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() 
                AND role = 'regional_manager'
            )
            AND EXISTS (
                SELECT 1 
                FROM user_location_assignments rm_loc
                INNER JOIN user_location_assignments lu_loc ON rm_loc.location_id = lu_loc.location_id
                WHERE rm_loc.user_id = auth.uid() 
                AND lu_loc.user_id = user_profiles.user_id
            )
        )
    )
    WITH CHECK (
        -- Same checks for new values
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'system_admin')
        )
        OR
        (
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() 
                AND role = 'regional_manager'
            )
            AND EXISTS (
                SELECT 1 
                FROM user_location_assignments rm_loc
                INNER JOIN user_location_assignments lu_loc ON rm_loc.location_id = lu_loc.location_id
                WHERE rm_loc.user_id = auth.uid() 
                AND lu_loc.user_id = user_profiles.user_id
            )
        )
    );

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

COMMENT ON TABLE user_profiles IS 'Extended profile information for users including contact details and photo.';
COMMENT ON COLUMN user_profiles.address IS 'JSON object with street, city, state, zip fields.';
