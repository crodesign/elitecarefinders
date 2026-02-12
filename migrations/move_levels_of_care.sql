-- Migration to move Levels of Care from Custom Fields to Fixed Fields

DO $$
DECLARE
    -- Variable to store the category ID to delete
    cat_id UUID;
BEGIN
    -- 1. Find the 'Levels of Care' category ID
    SELECT id INTO cat_id FROM room_field_categories WHERE slug = 'levels-of-care';

    -- 2. Delete the definition (cascade should handle it, but being explicit is safer/cleaner)
    -- Delete definitions first
    DELETE FROM room_field_definitions WHERE category_id = cat_id;
    -- Delete category
    DELETE FROM room_field_categories WHERE id = cat_id;

    -- 3. Update Check Constraint on room_fixed_field_options
    -- Drop the existing constraint
    ALTER TABLE room_fixed_field_options DROP CONSTRAINT IF EXISTS room_fixed_field_options_field_type_check;
    
    -- Add the updated constraint including 'levelOfCare'
    ALTER TABLE room_fixed_field_options 
    ADD CONSTRAINT room_fixed_field_options_field_type_check 
    CHECK (field_type IN ('bedroom', 'bathroom', 'shower', 'roomType', 'levelOfCare'));

    -- 4. Insert new Fixed Field Options for Levels of Care
    -- We are adding a new type 'levelOfCare'
    INSERT INTO room_fixed_field_options (field_type, value, display_order) VALUES
    ('levelOfCare', 'Independent Living', 1),
    ('levelOfCare', 'Assisted Living', 2),
    ('levelOfCare', 'Memory Care', 3);

END $$;
