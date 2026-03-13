ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS images      text[]  DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS video_url   text;
