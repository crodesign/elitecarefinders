-- Add featured_label column to homes table
ALTER TABLE homes 
ADD COLUMN IF NOT EXISTS featured_label TEXT;
