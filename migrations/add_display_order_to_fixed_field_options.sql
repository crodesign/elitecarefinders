-- Add display_order column to room_fixed_field_options table
ALTER TABLE room_fixed_field_options 
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
