
-- 1. Remove "bad" folders that might be causing duplicates/confusion
-- Specifically, folders named "home" or "facility" which are likely mistakes vs "Home Images"
DELETE FROM media_folders 
WHERE name IN ('home', 'facility') 
  AND parent_id IS NOT NULL; -- Don't delete root if any

-- 2. Update Slugs for "Home Images" to "home-images"
UPDATE media_folders
SET slug = 'home-images'
WHERE name = 'Home Images' AND slug != 'home-images';

-- 3. Update Slugs for "Facility Images" to "facility-images"
UPDATE media_folders
SET slug = 'facility-images'
WHERE name = 'Facility Images' AND slug != 'facility-images';

-- 4. Clean up any other duplicates for "Home Images" or "Facility Images" in same parent
-- Keep the one created most recently (or just one of them)
WITH Duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY parent_id, name 
               ORDER BY created_at DESC
           ) as rn
    FROM media_folders
    WHERE name IN ('Home Images', 'Facility Images')
)
DELETE FROM media_folders
WHERE id IN (
    SELECT id FROM Duplicates WHERE rn > 1
);
