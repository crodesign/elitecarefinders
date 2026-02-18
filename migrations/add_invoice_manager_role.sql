-- Migration: Add Invoice Manager Role
-- This migration updates the user roles system to include invoice_manager

-- ============================================================================
-- 1. UPDATE USER ROLES CHECK CONSTRAINT
-- ============================================================================

-- Drop existing check constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Add new constraint with invoice_manager
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('super_admin', 'system_admin', 'regional_manager', 'local_user', 'invoice_manager'));

-- ============================================================================
-- 2. UPDATE COMMENTS
-- ============================================================================

COMMENT ON TABLE user_roles IS 'Stores user roles for RBAC. Super Admin: full access. System Admin: all data access except some Settings. Regional Manager: manages local users in assigned regions. Local User: location-restricted access to own content. Invoice Manager: restricted access to Invoices and Contacts only.';
