-- Create room_field_categories table
CREATE TABLE IF NOT EXISTS room_field_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room_field_definitions table
CREATE TABLE IF NOT EXISTS room_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('boolean', 'single', 'multi')),
    options JSONB DEFAULT '[]'::jsonb,
    category_id UUID REFERENCES room_field_categories(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create room_fixed_field_options table
CREATE TABLE IF NOT EXISTS room_fixed_field_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_type TEXT NOT NULL CHECK (field_type IN ('bedroom', 'bathroom', 'shower', 'roomType')),
    value TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(field_type, value)
);

-- Add room_details column to homes table
ALTER TABLE homes ADD COLUMN IF NOT EXISTS room_details JSONB DEFAULT '{}'::jsonb;

-- Enable RLS
ALTER TABLE room_field_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_fixed_field_options ENABLE ROW LEVEL SECURITY;

-- Create policies for room_field_categories
CREATE POLICY "Allow public read access to room_field_categories"
    ON room_field_categories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full access to room_field_categories"
    ON room_field_categories FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for room_field_definitions
CREATE POLICY "Allow public read access to room_field_definitions"
    ON room_field_definitions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full access to room_field_definitions"
    ON room_field_definitions FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for room_fixed_field_options
CREATE POLICY "Allow public read access to room_fixed_field_options"
    ON room_fixed_field_options FOR SELECT USING (true);
CREATE POLICY "Allow authenticated full access to room_fixed_field_options"
    ON room_fixed_field_options FOR ALL USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_room_field_definitions_category ON room_field_definitions(category_id);
CREATE INDEX IF NOT EXISTS idx_room_field_definitions_active ON room_field_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_room_fixed_field_options_type ON room_fixed_field_options(field_type);
