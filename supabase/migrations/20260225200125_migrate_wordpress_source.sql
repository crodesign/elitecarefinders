-- Migrate all reviews with source 'wordpress' to 'internal'
UPDATE public.reviews
SET source = 'internal'
WHERE source = 'wordpress';
