-- Create table for storing metadata (icons) for fixed field types
CREATE TABLE IF NOT EXISTS room_fixed_field_types (
    field_type text PRIMARY KEY,
    icon text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE room_fixed_field_types ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view
CREATE POLICY "Enable read access for authenticated users" ON room_fixed_field_types
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy for authenticated users to insert/update
CREATE POLICY "Enable insert/update for authenticated users" ON room_fixed_field_types
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
