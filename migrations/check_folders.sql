-- Check current folder structure
SELECT 
    id,
    name,
    slug,
    parent_id,
    path,
    state_id,
    created_at
FROM media_folders
ORDER BY path;
