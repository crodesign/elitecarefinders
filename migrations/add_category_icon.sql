-- Add icon column to room_field_categories
-- Stores the Lucide icon name (e.g., 'Home', 'Heart', 'Building')
ALTER TABLE room_field_categories
ADD COLUMN IF NOT EXISTS icon text;

-- Add icon column to room_fixed_field_options
ALTER TABLE room_fixed_field_options
ADD COLUMN IF NOT EXISTS icon text;

-- Add icon column to room_field_definitions
-- Stores the Lucide icon name for the specific field definition
ALTER TABLE room_field_definitions
ADD COLUMN IF NOT EXISTS icon text;

-- Add icon column to room_fields
-- Stores the Lucide icon name for the specific field definition
ALTER TABLE room_fields
ADD COLUMN IF NOT EXISTS icon text;
