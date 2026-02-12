-- Update the room_field_definitions type check constraint
ALTER TABLE room_field_definitions DROP CONSTRAINT IF EXISTS room_field_definitions_type_check;

ALTER TABLE room_field_definitions 
    ADD CONSTRAINT room_field_definitions_type_check 
    CHECK (type IN ('boolean', 'single', 'multi', 'text', 'dropdown'));
