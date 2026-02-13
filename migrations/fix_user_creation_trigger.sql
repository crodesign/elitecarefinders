-- Fix: Drop the trigger on auth.users that auto-inserts into user_roles
-- This trigger causes "Database error creating new user" because it inserts
-- a role value that violates the CHECK constraint on user_roles.role
-- The application code already handles inserting into user_roles in the POST /api/admin/users handler.

-- 1. Update the CHECK constraint to include 'regional_manager'
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('super_admin', 'system_admin', 'regional_manager', 'local_user'));

-- 2. Drop the trigger that auto-inserts into user_roles on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_role() CASCADE;
