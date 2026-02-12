-- Add section column to room_field_categories
ALTER TABLE room_field_categories 
ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'room_details' 
CHECK (section IN ('room_details', 'location_details', 'care_provider_details'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_room_field_categories_section ON room_field_categories(section);
