-- Fix room_field_categories section constraint
-- The database currently has a constraint expecting 'col_1', 'col_2', 'col_3', 'col_4'
-- We need to migrate to 'room_details', 'location_details', 'care_provider_details'

-- Step 1: Drop the old constraint
ALTER TABLE room_field_categories 
DROP CONSTRAINT IF EXISTS room_field_categories_section_check;

-- Step 2: Update existing data to use the new semantic names
-- Map col_1 -> room_details (default/primary section)
UPDATE room_field_categories 
SET section = 'room_details' 
WHERE section = 'col_1';

UPDATE room_field_categories 
SET section = 'location_details' 
WHERE section = 'col_2';

UPDATE room_field_categories 
SET section = 'care_provider_details' 
WHERE section = 'col_3';

-- col_4 would also map to room_details as a fallback
UPDATE room_field_categories 
SET section = 'room_details' 
WHERE section = 'col_4';

-- Step 3: Add the new constraint with proper values
ALTER TABLE room_field_categories 
ADD CONSTRAINT room_field_categories_section_check 
CHECK (section IN ('room_details', 'location_details', 'care_provider_details'));

-- Step 4: Drop the old index if it exists and recreate
DROP INDEX IF EXISTS idx_room_field_categories_section;
CREATE INDEX idx_room_field_categories_section ON room_field_categories(section);
