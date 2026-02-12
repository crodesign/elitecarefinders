-- Add Care Provider Fields
-- Section: care_provider_details

-- 1. Create Categories (4 Columns)
WITH categories AS (
    INSERT INTO room_field_categories (name, slug, section, column_number, display_order)
    VALUES 
    ('Provider Information', 'provider-information', 'care_provider_details', 1, 1),
    ('Staffing & Contact', 'staffing-contact', 'care_provider_details', 2, 2),
    ('Food Options', 'food-options', 'care_provider_details', 3, 3),
    ('Skills & Specialties', 'skills-specialties', 'care_provider_details', 4, 4)
    RETURNING id, column_number
)
-- 2. Insert Fields
INSERT INTO room_field_definitions (name, slug, type, target_type, category_id, display_order, options, is_active)
SELECT 
    f.name, 
    f.slug, 
    f.type, -- Cast to text (column has check constraint, not enum type)
    'home', 
    c.id, 
    f.ord, 
    to_jsonb(f.options),
    true
FROM categories c
CROSS JOIN (VALUES
    -- Column 1
    (1, 'Care Provider Name', 'care-provider-name', 'text', 1, NULL::text[]),
    (1, 'Care Provider Title', 'care-provider-title', 'text', 2, NULL::text[]),
    (1, 'Care Provider Gender', 'care-provider-gender', 'single', 3, ARRAY['Female', 'Male', 'Unknown']),
    (1, 'About Care Provider', 'about-care-provider', 'text', 4, NULL::text[]),
    
    -- Column 2
    (2, 'Case Management Agency', 'case-management-agency', 'text', 1, NULL::text[]),
    (2, 'Care Provider Phone Number', 'care-provider-phone-number', 'text', 2, NULL::text[]),
    (2, 'Number on Staff', 'number-on-staff', 'single', 3, ARRAY['2', '3', '4', '5', '5+']),
    (2, 'Care Provider Hours', 'care-provider-hours', 'single', 4, ARRAY['Full Time', 'Part Time', 'On-call']),
    (2, 'Notes About Care Provider', 'notes-about-care-provider', 'text', 5, NULL::text[]),

    -- Column 3
    (3, 'Types of food available', 'types-of-food-available', 'multi', 1, ARRAY['American', 'Hawaiian', 'Chinese', 'Japanese', 'Korean', 'Local Food', 'Filipino', 'Undefined']),

    -- Column 4
    (4, 'Care Provider Skills/Specialties', 'care-provider-skills-specialties', 'multi', 1, ARRAY['Hospice', 'Behavioral', 'Wound Care', 'GT Feeding', 'Insulin Administration', 'Accepts behavioral clients needing 1-to-1 care', 'Able to perform hoyer lift transfers'])
) AS f(col_num, name, slug, type, ord, options)
WHERE c.column_number = f.col_num;
