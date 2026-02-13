-- Seed missing secondary/global media folders (Blog Images, Site Images, Temp)
-- These folders are state-independent and should always exist.
-- First, fix slugs on any existing rows, then insert if missing.

-- Fix slugs if folders already exist by path
UPDATE media_folders SET slug = 'blog-images' WHERE path = '/Blog Images' AND slug != 'blog-images';
UPDATE media_folders SET slug = 'site-images' WHERE path = '/Site Images' AND slug != 'site-images';
UPDATE media_folders SET slug = 'temp' WHERE path = '/Temp' AND slug != 'temp';

-- Insert only if not already present (check by path since that's the unique constraint)
INSERT INTO media_folders (name, slug, path)
SELECT 'Blog Images', 'blog-images', '/Blog Images'
WHERE NOT EXISTS (SELECT 1 FROM media_folders WHERE path = '/Blog Images');

INSERT INTO media_folders (name, slug, path)
SELECT 'Site Images', 'site-images', '/Site Images'
WHERE NOT EXISTS (SELECT 1 FROM media_folders WHERE path = '/Site Images');

INSERT INTO media_folders (name, slug, path)
SELECT 'Temp', 'temp', '/Temp'
WHERE NOT EXISTS (SELECT 1 FROM media_folders WHERE path = '/Temp');
