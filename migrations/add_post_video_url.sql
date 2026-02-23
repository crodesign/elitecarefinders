-- Add video_url column to posts table to support featured videos
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url text;
