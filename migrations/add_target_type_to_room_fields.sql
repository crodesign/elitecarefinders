-- Add target_type column to room_field_definitions to support scoping fields to Home or Facility
ALTER TABLE room_field_definitions 
ADD COLUMN target_type text NOT NULL DEFAULT 'both' 
CHECK (target_type IN ('home', 'facility', 'both'));

-- Update existing records if any (not strictly needed with DEFAULT 'both' but good for clarity)
UPDATE room_field_definitions SET target_type = 'both' WHERE target_type IS NULL;
