-- Add default_media_folder_id to user_profiles
ALTER TABLE user_profiles
ADD COLUMN default_media_folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL;
