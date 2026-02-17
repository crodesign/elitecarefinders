-- Check for duplicate data that could cause "more than one row" errors

-- 1. Check for duplicate user_roles (should be unique by user_id)
SELECT 'Duplicate user_roles' as issue, user_id, COUNT(*) as count
FROM user_roles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 2. Check for duplicate taxonomy_entries by slug
SELECT 'Duplicate taxonomy_entries by slug' as issue, slug, COUNT(*) as count
FROM taxonomy_entries
GROUP BY slug
HAVING COUNT(*) > 1;

-- 3. Check for duplicate media_folders by path
SELECT 'Duplicate media_folders by path' as issue, path, COUNT(*) as count
FROM media_folders
GROUP BY path
HAVING COUNT(*) > 1;

-- 4. Check for duplicate media_folders by parent+name
SELECT 'Duplicate media_folders by parent+name' as issue, 
       COALESCE(parent_id::text, 'NULL') as parent, 
       name, 
       COUNT(*) as count
FROM media_folders
GROUP BY parent_id, name
HAVING COUNT(*) > 1;

-- 5. List all RLS policies on homes table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'homes';
