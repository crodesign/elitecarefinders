-- Add state_id column to media_folders table to associate folders with states
ALTER TABLE media_folders
ADD COLUMN state_id uuid REFERENCES taxonomy_entries(id);

-- Create index for better query performance
CREATE INDEX idx_media_folders_state_id ON media_folders(state_id);

-- Update existing Home Images and Facility Images folders to reference Hawaii
-- First, get Hawaii's taxonomy entry ID
DO $$
DECLARE
    hawaii_id uuid;
BEGIN
    -- Find Hawaii in taxonomy_entries
    SELECT id INTO hawaii_id
    FROM taxonomy_entries
    WHERE slug = 'hawaii' OR name = 'Hawaii'
    LIMIT 1;
    
    -- Update Home Images and Facility Images folders if Hawaii was found
    IF hawaii_id IS NOT NULL THEN
        UPDATE media_folders
        SET state_id = hawaii_id
        WHERE slug IN ('home-images', 'facility-images');
        
        RAISE NOTICE 'Updated Home Images and Facility Images folders with Hawaii state_id: %', hawaii_id;
    ELSE
        RAISE NOTICE 'Hawaii not found in taxonomy_entries - folders not updated';
    END IF;
END $$;

-- Add comment to column
COMMENT ON COLUMN media_folders.state_id IS 'Reference to state taxonomy entry for location-specific folder filtering';
