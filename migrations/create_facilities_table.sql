-- Create facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  address JSONB DEFAULT '{}'::jsonb,
  license_number TEXT,
  capacity INTEGER,
  taxonomy_ids JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS facilities_slug_idx ON facilities (slug);

-- Enable RLS (Row Level Security)
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON facilities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON facilities
  FOR SELECT
  USING (true);
