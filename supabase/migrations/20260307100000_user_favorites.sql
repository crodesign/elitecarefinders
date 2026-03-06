-- Create user_favorites table for the public favorites system
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('home', 'facility', 'post')),
    entity_id UUID NOT NULL,
    entity_slug TEXT NOT NULL,
    entity_title TEXT,
    entity_image TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_favorites"
    ON user_favorites FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow public users to insert their own profile on registration
-- (admin users already have profiles created by admins)
CREATE POLICY "users_insert_own_profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);
