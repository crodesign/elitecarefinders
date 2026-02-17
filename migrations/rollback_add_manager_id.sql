
-- Rollback: Remove manager_id from user_profiles table
DROP INDEX IF EXISTS idx_user_profiles_manager_id;

ALTER TABLE user_profiles
DROP COLUMN IF EXISTS manager_id;
