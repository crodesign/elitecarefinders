-- Add title column for document display names
ALTER TABLE contact_documents ADD COLUMN IF NOT EXISTS title TEXT;

-- Backfill title from original_filename (strip extension)
UPDATE contact_documents
SET title = regexp_replace(original_filename, '\.[^.]+$', '')
WHERE title IS NULL;
