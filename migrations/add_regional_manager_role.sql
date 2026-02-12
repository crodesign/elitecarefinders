-- Migration: Add Regional Manager Role
-- This migration updates the user roles system to include regional_manager

-- ============================================================================
-- 1. UPDATE USER ROLES CHECK CONSTRAINT
-- ============================================================================

-- Drop existing check constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new constraint with regional_manager
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('super_admin', 'system_admin', 'regional_manager', 'local_user'));

-- ============================================================================
-- 2. UPDATE HELPER FUNCTIONS
-- ============================================================================

-- The get_user_role function doesn't need changes (it just returns the role)
-- The can_edit_by_location function already handles regional_manager as it uses IN clause

-- Add comment for clarity
COMMENT ON TABLE user_roles IS 'Stores user roles for RBAC. Super Admin: full access. System Admin: all data access except some Settings. Regional Manager: manages local users in assigned regions. Local User: location-restricted access to own content.';
