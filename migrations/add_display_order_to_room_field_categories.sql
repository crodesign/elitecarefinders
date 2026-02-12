-- Add display_order column to room_field_categories table if it doesn't exist
ALTER TABLE room_field_categories 
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
