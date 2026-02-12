-- Create Hawaii Island Folder Structure
-- This migration restructures Hawaii folders to include island-level organization

DO $$
DECLARE
    hawaii_state_id uuid;
    hawaii_parent_folder_id uuid;
    island_folder_id uuid;
    home_folder_id uuid;
    facility_folder_id uuid;
    old_home_id uuid;
    old_facility_id uuid;
BEGIN
    -- Get Hawaii state ID
    SELECT id INTO hawaii_state_id
    FROM taxonomy_entries
    WHERE slug = 'hawaii'
    LIMIT 1;

    IF hawaii_state_id IS NULL THEN
        RAISE EXCEPTION 'Hawaii state not found in taxonomy_entries';
    END IF;

    -- Get existing Hawaii parent folder
    SELECT id INTO hawaii_parent_folder_id
    FROM media_folders
    WHERE state_id = hawaii_state_id AND parent_id IS NULL
    LIMIT 1;

    -- Store old Home Images and Facility Images folder IDs for migration
    SELECT id INTO old_home_id
    FROM media_folders
    WHERE parent_id = hawaii_parent_folder_id AND name = 'Home Images';

    SELECT id INTO old_facility_id
    FROM media_folders
    WHERE parent_id = hawaii_parent_folder_id AND name = 'Facility Images';

    -- Delete old Home Images and Facility Images folders (will cascade to subfolders)
    DELETE FROM media_folders WHERE id = old_home_id;
    DELETE FROM media_folders WHERE id = old_facility_id;

    -- Create island folders and their Home/Facility subfolders
    -- Oahu
    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Oahu', 'oahu', hawaii_parent_folder_id, '/Hawaii/Oahu', hawaii_state_id)
    RETURNING id INTO island_folder_id;

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Home Images', 'oahu-home-images', island_folder_id, '/Hawaii/Oahu/Home Images', hawaii_state_id);

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Facility Images', 'oahu-facility-images', island_folder_id, '/Hawaii/Oahu/Facility Images', hawaii_state_id);

    -- Maui
    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Maui', 'maui', hawaii_parent_folder_id, '/Hawaii/Maui', hawaii_state_id)
    RETURNING id INTO island_folder_id;

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Home Images', 'maui-home-images', island_folder_id, '/Hawaii/Maui/Home Images', hawaii_state_id);

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Facility Images', 'maui-facility-images', island_folder_id, '/Hawaii/Maui/Facility Images', hawaii_state_id);

    -- Hawaii (Big Island)
    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Hawaii', 'big-island', hawaii_parent_folder_id, '/Hawaii/Hawaii', hawaii_state_id)
    RETURNING id INTO island_folder_id;

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Home Images', 'big-island-home-images', island_folder_id, '/Hawaii/Hawaii/Home Images', hawaii_state_id);

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Facility Images', 'big-island-facility-images', island_folder_id, '/Hawaii/Hawaii/Facility Images', hawaii_state_id);

    -- Kauai
    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Kauai', 'kauai', hawaii_parent_folder_id, '/Hawaii/Kauai', hawaii_state_id)
    RETURNING id INTO island_folder_id;

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Home Images', 'kauai-home-images', island_folder_id, '/Hawaii/Kauai/Home Images', hawaii_state_id);

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Facility Images', 'kauai-facility-images', island_folder_id, '/Hawaii/Kauai/Facility Images', hawaii_state_id);

    -- Molokai
    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Molokai', 'molokai', hawaii_parent_folder_id, '/Hawaii/Molokai', hawaii_state_id)
    RETURNING id INTO island_folder_id;

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Home Images', 'molokai-home-images', island_folder_id, '/Hawaii/Molokai/Home Images', hawaii_state_id);

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Facility Images', 'molokai-facility-images', island_folder_id, '/Hawaii/Molokai/Facility Images', hawaii_state_id);

    -- Lanai
    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Lanai', 'lanai', hawaii_parent_folder_id, '/Hawaii/Lanai', hawaii_state_id)
    RETURNING id INTO island_folder_id;

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Home Images', 'lanai-home-images', island_folder_id, '/Hawaii/Lanai/Home Images', hawaii_state_id);

    INSERT INTO media_folders (name, slug, parent_id, path, state_id)
    VALUES ('Facility Images', 'lanai-facility-images', island_folder_id, '/Hawaii/Lanai/Facility Images', hawaii_state_id);

    RAISE NOTICE 'Hawaii island folder structure created successfully';
END $$;
