-- Add manager_id to user_profiles to track who created/manages the user
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id);

-- Add comment
COMMENT ON COLUMN user_profiles.manager_id IS 'References the user (e.g., Regional Manager) who created or manages this user.';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_manager_id ON user_profiles(manager_id);
