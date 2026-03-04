-- Create reviews folder (top-level) and profiles folder (under site)
-- Run in Supabase dashboard SQL editor

DO $$
DECLARE
    site_id uuid;
BEGIN
    -- Create reviews folder at root
    INSERT INTO media_folders (name, slug, path, parent_id)
    VALUES ('reviews', 'reviews', 'reviews', NULL)
    ON CONFLICT DO NOTHING;

    -- Get site folder id
    SELECT id INTO site_id FROM media_folders WHERE slug = 'site' AND parent_id IS NULL;

    -- Create profiles folder under site
    IF site_id IS NOT NULL THEN
        INSERT INTO media_folders (name, slug, path, parent_id)
        VALUES ('profiles', 'profiles', 'site/profiles', site_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
