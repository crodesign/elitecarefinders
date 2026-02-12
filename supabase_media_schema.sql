-- Media Manager Database Schema
-- Run this in Supabase SQL Editor

-- Create media_folders table
CREATE TABLE IF NOT EXISTS media_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(path)
);

-- Create media_items table
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  title TEXT,
  alt_text TEXT,
  caption TEXT,
  description TEXT,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_folders_parent ON media_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_media_items_folder ON media_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_media_items_created ON media_items(created_at DESC);

-- Seed default folders
INSERT INTO media_folders (name, slug, path) VALUES
  ('Blog Images', 'blog-images', '/Blog Images'),
  ('Facility Images', 'facility-images', '/Facility Images'),
  ('Home Images', 'home-images', '/Home Images'),
  ('Site Images', 'site-images', '/Site Images'),
  ('Temp', 'temp', '/Temp')
ON CONFLICT (path) DO NOTHING;

-- Enable RLS
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - customize as needed)
CREATE POLICY "Allow all for media_folders" ON media_folders FOR ALL USING (true);
CREATE POLICY "Allow all for media_items" ON media_items FOR ALL USING (true);
