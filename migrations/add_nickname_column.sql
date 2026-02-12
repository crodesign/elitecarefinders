-- Migration: Add Nickname Column to User Profiles
-- Allows users to login with either email or nickname

-- ============================================================================
-- 1. ADD NICKNAME COLUMN
-- ============================================================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE;

-- ============================================================================
-- 2. CREATE INDEX FOR LOGIN PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_nickname ON user_profiles(nickname);

-- ============================================================================
-- 3. ADD CONSTRAINT FOR NICKNAME FORMAT
-- ============================================================================

-- Ensure nickname is lowercase and doesn't contain spaces or special chars
ALTER TABLE user_profiles
ADD CONSTRAINT nickname_format_check 
CHECK (nickname IS NULL OR (nickname ~ '^[a-z0-9_-]+$' AND LENGTH(nickname) >= 3));

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================

COMMENT ON COLUMN user_profiles.nickname IS 'Unique username for login. Must be lowercase alphanumeric with underscore/dash, minimum 3 characters.';
