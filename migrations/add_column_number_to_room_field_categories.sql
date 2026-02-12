-- Add column_number field to room_field_categories
ALTER TABLE room_field_categories 
ADD COLUMN IF NOT EXISTS column_number INT DEFAULT 1 
CHECK (column_number IN (1, 2, 3, 4));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_room_field_categories_column ON room_field_categories(column_number);
