-- Assign column numbers for location_details categories used on facility page
-- Col 1: Meals & Dining, Col 2: Transportation, Col 3: Common Areas + Recreational Areas

UPDATE public.room_field_categories
SET column_number = 1
WHERE section = 'location_details' AND name ILIKE '%Meals%Dining%';
