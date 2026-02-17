
-- Add manager_id to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager_id ON user_profiles(manager_id);
