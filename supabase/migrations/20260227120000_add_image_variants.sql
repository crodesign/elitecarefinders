ALTER TABLE media_items
  ADD COLUMN IF NOT EXISTS url_large text,
  ADD COLUMN IF NOT EXISTS url_medium text,
  ADD COLUMN IF NOT EXISTS url_thumb text;
