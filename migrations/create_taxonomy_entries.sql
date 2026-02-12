-- Create taxonomy_entries table
-- This stores individual entries within each taxonomy (e.g., "California" in "State" taxonomy)

CREATE TABLE IF NOT EXISTS taxonomy_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    taxonomy_id UUID NOT NULL REFERENCES taxonomies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(taxonomy_id, slug)
);

-- Enable RLS
ALTER TABLE taxonomy_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (development)
CREATE POLICY "Allow anonymous read access to taxonomy_entries"
ON taxonomy_entries FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anonymous write access to taxonomy_entries"
ON taxonomy_entries FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Create index for faster lookups by taxonomy
CREATE INDEX IF NOT EXISTS idx_taxonomy_entries_taxonomy_id ON taxonomy_entries(taxonomy_id);
