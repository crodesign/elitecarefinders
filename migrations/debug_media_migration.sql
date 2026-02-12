-- Debug script to check media migration status
-- Run this to see where your media items are

-- Check if old folders still exist
SELECT 'Old Folders Status' as check_type;
SELECT id, name, slug, path 
FROM media_folders 
WHERE slug IN ('home-images', 'facility-images')
ORDER BY name;

-- Check Hawaii state folders
SELECT 'Hawaii Folders' as check_type;
SELECT mf.id, mf.name, mf.slug, mf.path, mf.parent_id
FROM media_folders mf
JOIN taxonomy_entries te ON mf.state_id = te.id
WHERE te.slug = 'hawaii'
ORDER BY mf.path;

-- Check media items - where are they now?
SELECT 'Media Items by Folder' as check_type;
SELECT 
    mf.name as folder_name,
    mf.path as folder_path,
    COUNT(mi.id) as item_count
FROM media_folders mf
LEFT JOIN media_items mi ON mi.folder_id = mf.id
WHERE mf.slug LIKE '%home-images%' OR mf.slug LIKE '%facility-images%'
GROUP BY mf.id, mf.name, mf.path
ORDER BY mf.path;

-- Show all media items with their folder paths
SELECT 'All Media Items with Paths' as check_type;
SELECT 
    mi.id,
    mi.title,
    mi.filename,
    mf.name as folder_name,
    mf.path as folder_path
FROM media_items mi
JOIN media_folders mf ON mi.folder_id = mf.id
ORDER BY mf.path, mi.title;
