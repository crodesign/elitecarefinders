-- Create "site" media folder and register the 4 site SVG images
-- Run in Supabase dashboard SQL editor

DO $$
DECLARE
    folder_id uuid;
BEGIN
    -- Create the site folder (skip if it already exists)
    INSERT INTO media_folders (name, slug, path, parent_id)
    VALUES ('site', 'site', 'site', NULL)
    ON CONFLICT DO NOTHING
    RETURNING id INTO folder_id;

    -- If already existed, fetch its id
    IF folder_id IS NULL THEN
        SELECT id INTO folder_id FROM media_folders WHERE slug = 'site' AND parent_id IS NULL;
    END IF;

    -- Insert the 4 site images
    INSERT INTO media_items (folder_id, filename, original_filename, title, mime_type, file_size, width, height, storage_path, url)
    VALUES
        (folder_id, 'ecf-logo-white.svg', 'Elite CareFinders Logo w-c.svg', 'ECF Logo (White)', 'image/svg+xml', 8180, NULL, NULL, '/images/site/ecf-logo-white.svg', '/images/site/ecf-logo-white.svg'),
        (folder_id, 'ecf-logo-black.svg', 'Elite CareFinders Logo b-c.svg', 'ECF Logo (Black)', 'image/svg+xml', 7966, NULL, NULL, '/images/site/ecf-logo-black.svg', '/images/site/ecf-logo-black.svg'),
        (folder_id, 'hibiscus-bg.svg',    'hibiscus-bg.svg',                'Hibiscus BG (Light)', 'image/svg+xml', 22216, NULL, NULL, '/images/site/hibiscus-bg.svg', '/images/site/hibiscus-bg.svg'),
        (folder_id, 'hibiscus-bg-b.svg',  'hibiscus-bg-b.svg',              'Hibiscus BG (Dark)',  'image/svg+xml', 24565, NULL, NULL, '/images/site/hibiscus-bg-b.svg', '/images/site/hibiscus-bg-b.svg')
    ON CONFLICT DO NOTHING;
END $$;
