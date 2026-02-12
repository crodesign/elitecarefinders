-- Allow public (anon) access to modify room field definitions
-- This is useful for development if auth is not strictly enforced on the setup page

-- Room Field Categories
DROP POLICY IF EXISTS "Allow authenticated full access to room_field_categories" ON room_field_categories;
DROP POLICY IF EXISTS "Allow public read access to room_field_categories" ON room_field_categories;

CREATE POLICY "Allow full public access to room_field_categories"
ON room_field_categories FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Room Field Definitions
DROP POLICY IF EXISTS "Allow authenticated full access to room_field_definitions" ON room_field_definitions;
DROP POLICY IF EXISTS "Allow public read access to room_field_definitions" ON room_field_definitions;

CREATE POLICY "Allow full public access to room_field_definitions"
ON room_field_definitions FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Room Fixed Field Options
DROP POLICY IF EXISTS "Allow authenticated full access to room_fixed_field_options" ON room_fixed_field_options;
DROP POLICY IF EXISTS "Allow public read access to room_fixed_field_options" ON room_fixed_field_options;

CREATE POLICY "Allow full public access to room_fixed_field_options"
ON room_fixed_field_options FOR ALL
TO public
USING (true)
WITH CHECK (true);
