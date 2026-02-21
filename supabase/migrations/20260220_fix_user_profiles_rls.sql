-- Fix RLS policies to allow users to update their own profiles 
-- (including themes) without conflicting with admin policies.

BEGIN;

-- Drop the potentially conflicting UPDATE policy
DROP POLICY IF EXISTS ""Authorized users can update profiles"" ON user_profiles;
DROP POLICY IF EXISTS ""Users can update their own profile"" ON user_profiles;

-- Recreate policy for users updating their own profile
CREATE POLICY ""Users can update their own profile"" ON user_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Recreate policy for admins updating profiles
CREATE POLICY ""Admins and Regional Managers can update profiles"" ON user_profiles
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

COMMIT;