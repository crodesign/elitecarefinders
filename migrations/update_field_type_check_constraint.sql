-- Drop the existing check constraint
ALTER TABLE room_field_definitions DROP CONSTRAINT IF EXISTS room_field_definitions_type_check;

-- Add the updated check constraint including 'currency'
ALTER TABLE room_field_definitions
ADD CONSTRAINT room_field_definitions_type_check 
CHECK (type IN ('boolean', 'single', 'multi', 'text', 'textarea', 'number', 'currency', 'phone', 'email', 'dropdown'));
