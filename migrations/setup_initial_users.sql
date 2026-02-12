-- Script to create initial admin users in Supabase
-- Run this in Supabase SQL Editor AFTER running setup_auth_and_rls.sql

-- This script will:
-- 1. Create auth users via SQL
-- 2. Insert corresponding user_roles records

-- ============================================================================
-- IMPORTANT: Replace these UUIDs with the actual user IDs after creating users
-- ============================================================================

-- Note: Supabase Auth users should ideally be created via the Supabase Dashboard
-- or the Auth API, not directly in SQL. This script provides the user_roles
-- entries that link to those auth users.

-- After creating the users in Supabase Dashboard (Authentication > Users > Add User):
-- 1. Create user with email: clients@crodesign.com, password: Maunakea808!
-- 2. Create user with email: r.gallego@elitecarefinders.com, password: ECFWaikiki808!
-- 3. Copy their user IDs from the dashboard
-- 4. Replace the UUIDs below and run this script

-- ============================================================================
-- INSERT USER ROLES
-- ============================================================================

-- Replace 'SUPER_ADMIN_USER_ID_HERE' with the actual UUID from Supabase Auth
INSERT INTO user_roles (user_id, role, display_name)
VALUES (
    '517ef1eb-10d9-4219-94a0-2e70f3435821'::uuid,
    'super_admin',
    'Super Administrator'
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'super_admin', display_name = 'Super Administrator';

-- Replace 'SYSTEM_ADMIN_USER_ID_HERE' with the actual UUID from  Supabase Auth
INSERT INTO user_roles (user_id, role, display_name)
VALUES (
    '5b23e28d-7a24-46db-bbc0-7c53616df171'::uuid,
    'system_admin',
    'System Administrator'
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'system_admin', display_name = 'System Administrator';

-- Verify insertions
SELECT * FROM user_roles;
