-- Migration to add 'languages' to fixed field options

DO $$
DECLARE
    -- Variable to store the category ID (if needed, though not creating a category here)
    cat_id UUID;
BEGIN
    -- 1. Update Check Constraint on room_fixed_field_options
    -- Drop the existing constraint
    ALTER TABLE room_fixed_field_options DROP CONSTRAINT IF EXISTS room_fixed_field_options_field_type_check;
    
    -- Add the updated constraint including 'language'
    ALTER TABLE room_fixed_field_options 
    ADD CONSTRAINT room_fixed_field_options_field_type_check 
    CHECK (field_type IN ('bedroom', 'bathroom', 'shower', 'roomType', 'levelOfCare', 'language'));

    -- 2. Insert new Fixed Field Options for Languages
    INSERT INTO room_fixed_field_options (field_type, value, display_order) VALUES
    ('language', 'English', 1),
    ('language', 'Cebuano', 2),
    ('language', 'Chinese', 3),
    ('language', 'Hawaiian', 4),
    ('language', 'Ilocano', 5),
    ('language', 'Ilongo', 6),
    ('language', 'Japanese', 7),
    ('language', 'Korean', 8),
    ('language', 'Pilipino', 9),
    ('language', 'Spanish', 10),
    ('language', 'Tagalog', 11),
    ('language', 'Vietnamese', 12)
    ON CONFLICT (field_type, value) DO NOTHING;

END $$;
