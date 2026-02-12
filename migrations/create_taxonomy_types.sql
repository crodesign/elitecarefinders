-- Migration: Create taxonomy_types table
-- Run this in your Supabase SQL Editor

-- Create taxonomy_types table
CREATE TABLE IF NOT EXISTS taxonomy_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE taxonomy_types ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous read access (for fetching types)
CREATE POLICY "Allow anonymous read access to taxonomy_types"
ON taxonomy_types FOR SELECT
TO anon
USING (true);

-- Create policy to allow anonymous insert/update/delete (for admin operations)
-- In production, you'd want to restrict this to authenticated users
CREATE POLICY "Allow anonymous write access to taxonomy_types"
ON taxonomy_types FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Insert default taxonomy types
INSERT INTO taxonomy_types (name, slug, description) VALUES
    ('Neighborhood', 'neighborhood', 'Geographic neighborhood or area'),
    ('Amenity', 'amenity', 'Facility amenities and features'),
    ('Service', 'service', 'Services provided'),
    ('Care Type', 'care-type', 'Types of care offered')
ON CONFLICT (slug) DO NOTHING;

-- Create an index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_taxonomy_types_slug ON taxonomy_types(slug);
