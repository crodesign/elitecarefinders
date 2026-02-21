-- Add theme preference columns to user_profiles
-- Allows each user's accent color and light/dark preference to persist across devices

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS theme_mode    TEXT        NOT NULL DEFAULT 'dark'
                                         CHECK (theme_mode IN ('dark', 'light')),
  ADD COLUMN IF NOT EXISTS theme_accent  VARCHAR(7)  NOT NULL DEFAULT '#239ddb';

-- Verify
-- SELECT user_id, theme_mode, theme_accent FROM user_profiles LIMIT 10;
