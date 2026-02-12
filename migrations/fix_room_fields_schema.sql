-- Comprehensive fix for Room Fields Schema issues

-- 1. Ensure target_type column exists
ALTER TABLE room_field_definitions 
ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'both';

-- 2. Update target_type check constraint
-- First drop potential old constraints to ensure clean state
ALTER TABLE room_field_definitions DROP CONSTRAINT IF EXISTS room_field_definitions_target_type_check;

ALTER TABLE room_field_definitions 
ADD CONSTRAINT room_field_definitions_target_type_check 
CHECK (target_type IN ('home', 'facility', 'both'));

-- 3. Update room field types check constraint to include 'text' and 'dropdown'
ALTER TABLE room_field_definitions DROP CONSTRAINT IF EXISTS room_field_definitions_type_check;

ALTER TABLE room_field_definitions 
ADD CONSTRAINT room_field_definitions_type_check 
CHECK (type IN ('boolean', 'single', 'multi', 'text', 'dropdown'));

-- 4. Fix room_field_categories section constraint
ALTER TABLE room_field_categories DROP CONSTRAINT IF EXISTS room_field_categories_section_check;

-- Ensure we update old/invalid values first to avoid constraint violation
UPDATE room_field_categories 
SET section = 'room_details' 
WHERE section NOT IN ('room_details', 'location_details', 'care_provider_details');

ALTER TABLE room_field_categories 
ADD CONSTRAINT room_field_categories_section_check 
CHECK (section IN ('room_details', 'location_details', 'care_provider_details'));

-- 5. Recreate index for category sections if missing
DROP INDEX IF EXISTS idx_room_field_categories_section;
CREATE INDEX idx_room_field_categories_section ON room_field_categories(section);
