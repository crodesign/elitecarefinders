-- Add images column to reviews table
ALTER TABLE public.reviews
ADD COLUMN images text[] DEFAULT '{}';
