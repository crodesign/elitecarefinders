-- Migration: Create hierarchical state-based folder structure
-- Creates state folders for all 50 states, each with Home Images and Facility Images subfolders
-- Migrates existing Hawaii media items to the new structure

-- ============================================================================
-- 1. Get Hawaii's taxonomy entry ID
-- ============================================================================
DO $$
DECLARE
    hawaii_id uuid;
    state_id uuid;
    state_folder_id uuid;
    home_folder_id uuid;
    facility_folder_id uuid;
    old_home_id uuid;
    old_facility_id uuid;
BEGIN
    -- Find Hawaii in taxonomy_entries
    SELECT id INTO hawaii_id
    FROM taxonomy_entries
    WHERE slug = 'hawaii'
    LIMIT 1;

    IF hawaii_id IS NULL THEN
        RAISE EXCEPTION 'Hawaii not found in taxonomy_entries. Please run populate_locations.sql first.';
    END IF;

    -- Get IDs of old folders to migrate
    SELECT id INTO old_home_id FROM media_folders WHERE slug = 'home-images' LIMIT 1;
    SELECT id INTO old_facility_id FROM media_folders WHERE slug = 'facility-images' LIMIT 1;

-- ============================================================================
-- 2. Create state folders for all 50 states
-- ============================================================================

    -- Loop through all states and create folder structure
    FOR state_id IN 
        SELECT id FROM taxonomy_entries 
        WHERE taxonomy_id = (SELECT id FROM taxonomies WHERE slug = 'location' LIMIT 1)
        AND parent_id IS NULL
        ORDER BY name
    LOOP
        -- Create state folder
        INSERT INTO media_folders (name, slug, path, state_id)
        SELECT 
            name, 
            slug || '-media',
            '/' || name,
            id
        FROM taxonomy_entries WHERE id = state_id
        RETURNING id INTO state_folder_id;

        -- Create Home Images subfolder
        INSERT INTO media_folders (name, slug, parent_id, path, state_id)
        SELECT 
            'Home Images',
            slug || '-home-images',
            state_folder_id,
            '/' || name || '/Home Images',
            id
        FROM taxonomy_entries WHERE id = state_id
        RETURNING id INTO home_folder_id;

        -- Create Facility Images subfolder
        INSERT INTO media_folders (name, slug, parent_id, path, state_id)
        SELECT 
            'Facility Images',
            slug || '-facility-images',
            state_folder_id,
            '/' || name || '/Facility Images',
            id
        FROM taxonomy_entries WHERE id = state_id
        RETURNING id INTO facility_folder_id;

        -- For Hawaii, migrate existing media items
        IF state_id = hawaii_id THEN
            -- Move media items from old Home Images to new Hawaii > Home Images
            IF old_home_id IS NOT NULL THEN
                UPDATE media_items
                SET folder_id = home_folder_id
                WHERE folder_id = old_home_id;
                
                RAISE NOTICE 'Migrated media items from Home Images to Hawaii > Home Images';
            END IF;

            -- Move media items from old Facility Images to new Hawaii > Facility Images
            IF old_facility_id IS NOT NULL THEN
                UPDATE media_items
                SET folder_id = facility_folder_id
                WHERE folder_id = old_facility_id;
                
                RAISE NOTICE 'Migrated media items from Facility Images to Hawaii > Facility Images';
            END IF;
        END IF;
    END LOOP;

-- ============================================================================
-- 3. Delete old standalone Home/Facility folders
-- ============================================================================

    -- Delete old folders (media items already migrated)
    DELETE FROM media_folders WHERE id = old_home_id;
    DELETE FROM media_folders WHERE id = old_facility_id;

    RAISE NOTICE 'Created hierarchical folder structure for all 50 states';
    RAISE NOTICE 'Migrated Hawaii content to new structure';
    RAISE NOTICE 'Deleted old standalone Home/Facility folders';
END $$;

