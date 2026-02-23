-- Rename the deprecated cover_image columns to featured_image
ALTER TABLE public.posts 
RENAME COLUMN cover_image_id TO featured_image_id;

-- Some systems might have manually added cover_image_url. 
-- We gracefully attempt to rename it if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='posts' AND column_name='cover_image_url'
  ) THEN
    ALTER TABLE public.posts RENAME COLUMN cover_image_url TO featured_image_url;
  END IF;
END $$;

-- Add the images array to store the full Post Gallery
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}'::text[];
