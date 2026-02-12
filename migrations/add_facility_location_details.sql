-- Migration to add Facility Details categories and fields
-- Section: location_details
-- Target Type: facility

DO $$
DECLARE
    -- Category IDs
    cat_levels_care_id UUID;
    cat_health_care_id UUID;
    cat_add_services_id UUID;
    cat_meals_id UUID;
    cat_common_areas_id UUID;
    cat_transport_id UUID;
    cat_recreation_id UUID;
    cat_pets_id UUID;
BEGIN

    -- 1. Levels of Care
    INSERT INTO room_field_categories (name, slug, display_order, section, column_number)
    VALUES ('Levels of Care', 'levels-of-care', 10, 'location_details', 1)
    RETURNING id INTO cat_levels_care_id;

    INSERT INTO room_field_definitions (category_id, name, slug, type, target_type, options, display_order, is_active)
    VALUES
    (cat_levels_care_id, 'Levels of Care', 'levels-of-care', 'multi', 'facility', '["Independent Living", "Assisted Living", "Memory Care"]', 1, true);

    -- 2. Health Care Services
    INSERT INTO room_field_categories (name, slug, display_order, section, column_number)
    VALUES ('Health Care Services', 'health-care-services', 20, 'location_details', 1)
    RETURNING id INTO cat_health_care_id;

    INSERT INTO room_field_definitions (category_id, name, slug, type, target_type, display_order, is_active)
    VALUES
    (cat_health_care_id, 'Diabetic Care', 'diabetic-care', 'boolean', 'facility', 1, true),
    (cat_health_care_id, 'Medication Management', 'medication-management', 'boolean', 'facility', 2, true),
    (cat_health_care_id, 'Ambulatory Care', 'ambulatory-care', 'boolean', 'facility', 3, true),
    (cat_health_care_id, 'Incontinence care', 'incontinence-care', 'boolean', 'facility', 4, true);

    -- 3. Additional Services
    INSERT INTO room_field_categories (name, slug, display_order, section, column_number)
    VALUES ('Additional Services', 'additional-services', 30, 'location_details', 1)
    RETURNING id INTO cat_add_services_id;

    INSERT INTO room_field_definitions (category_id, name, slug, type, target_type, display_order, is_active)
    VALUES
    (cat_add_services_id, 'Hospice available on-site', 'hospice-available', 'boolean', 'facility', 1, true),
    (cat_add_services_id, 'Podiatrist', 'podiatrist', 'boolean', 'facility', 2, true),
    (cat_add_services_id, 'Physical Therapist', 'physical-therapist', 'boolean', 'facility', 3, true),
    (cat_add_services_id, 'Nurse', 'nurse', 'boolean', 'facility', 4, true),
    (cat_add_services_id, 'Doctor on staff', 'doctor-on-staff', 'boolean', 'facility', 5, true),
    (cat_add_services_id, 'Massage Therapist', 'massage-therapist', 'boolean', 'facility', 6, true),
    -- From "Additional Services (Cont.)" section in extraction
    (cat_add_services_id, 'Housekeeping', 'housekeeping', 'boolean', 'facility', 7, true),
    (cat_add_services_id, 'Grocery Shopping and Errands', 'grocery-shopping', 'boolean', 'facility', 8, true),
    (cat_add_services_id, 'Laundry Service / Drycleaning', 'laundry-service', 'boolean', 'facility', 9, true),
    (cat_add_services_id, 'Beautician', 'beautician', 'boolean', 'facility', 10, true);

    -- 4. Meals & Dining
    INSERT INTO room_field_categories (name, slug, display_order, section, column_number)
    VALUES ('Meals & Dining', 'meals-dining', 40, 'location_details', 2)
    RETURNING id INTO cat_meals_id;

    INSERT INTO room_field_definitions (category_id, name, slug, type, target_type, display_order, is_active)
    VALUES
    (cat_meals_id, 'Meals Provided', 'meals-provided', 'boolean', 'facility', 1, true),
    (cat_meals_id, 'Restaurant Style Dining', 'restaurant-style-dining', 'boolean', 'facility', 2, true),
    (cat_meals_id, 'Anytime Dining', 'anytime-dining', 'boolean', 'facility', 3, true),
    (cat_meals_id, 'Professional Chef', 'professional-chef', 'boolean', 'facility', 4, true),
    (cat_meals_id, 'Guest Meals', 'guest-meals', 'boolean', 'facility', 5, true),
    (cat_meals_id, 'International Cuisine', 'international-cuisine', 'boolean', 'facility', 6, true),
    (cat_meals_id, 'Local Cuisine', 'local-cuisine', 'boolean', 'facility', 7, true),
    (cat_meals_id, 'Vegetarian', 'vegetarian', 'boolean', 'facility', 8, true),
    (cat_meals_id, 'Gluten-free', 'gluten-free', 'boolean', 'facility', 9, true),
    (cat_meals_id, 'Custom Menu', 'custom-menu', 'boolean', 'facility', 10, true),
    (cat_meals_id, 'Low / No Sodium or Sugar', 'low-no-sodium-sugar', 'boolean', 'facility', 11, true);

    -- 5. Common Areas
    INSERT INTO room_field_categories (name, slug, display_order, section, column_number)
    VALUES ('Common Areas', 'common-areas', 50, 'location_details', 2)
    RETURNING id INTO cat_common_areas_id;

    INSERT INTO room_field_definitions (category_id, name, slug, type, target_type, display_order, is_active)
    VALUES
    (cat_common_areas_id, 'Outdoor Patio', 'outdoor-patio', 'boolean', 'facility', 1, true),
    (cat_common_areas_id, 'Meeting Room', 'meeting-room', 'boolean', 'facility', 2, true),
    (cat_common_areas_id, 'TV Lounge', 'tv-lounge', 'boolean', 'facility', 3, true),
    (cat_common_areas_id, 'Computer or Media Center', 'computer-media-center', 'boolean', 'facility', 4, true),
    (cat_common_areas_id, 'Library', 'library', 'boolean', 'facility', 5, true),
    (cat_common_areas_id, 'Beauty Salon', 'beauty-salon', 'boolean', 'facility', 6, true);

    -- 6. Transportation
    INSERT INTO room_field_categories (name, slug, display_order, section, column_number)
    VALUES ('Transportation', 'transportation-details', 60, 'location_details', 3)
    RETURNING id INTO cat_transport_id;

    INSERT INTO room_field_definitions (category_id, name, slug, type, target_type, display_order, is_active)
    VALUES
    (cat_transport_id, 'Resident Parking Available', 'resident-parking', 'boolean', 'facility', 1, true),
    (cat_transport_id, 'Guest Parking Available', 'guest-parking', 'boolean', 'facility', 2, true),
    (cat_transport_id, 'Transportation at Cost', 'transportation-cost', 'boolean', 'facility', 3, true),
    (cat_transport_id, 'Transportation to Doctor''s Office', 'transport-doctor', 'boolean', 'facility', 4, true),
    (cat_transport_id, 'Complimentary Transportation', 'complimentary-transport', 'boolean', 'facility', 5, true),
    (cat_transport_id, 'Convenient to Public Transit', 'public-transit', 'boolean', 'facility', 6, true);

    -- 7. Recreational Areas
    INSERT INTO room_field_categories (name, slug, display_order, section, column_number)
    VALUES ('Recreational Areas', 'recreational-areas', 70, 'location_details', 3)
    RETURNING id INTO cat_recreation_id;

    INSERT INTO room_field_definitions (category_id, name, slug, type, target_type, display_order, is_active)
    VALUES
    (cat_recreation_id, 'Swimming Pool', 'swimming-pool', 'boolean', 'facility', 1, true),
    (cat_recreation_id, 'Fitness Center', 'fitness-center', 'boolean', 'facility', 2, true),
    (cat_recreation_id, 'Arts and Crafts Center', 'arts-crafts-center', 'boolean', 'facility', 3, true),
    (cat_recreation_id, 'Community Garden', 'community-garden', 'boolean', 'facility', 4, true),
    (cat_recreation_id, 'Movie or Theater Room', 'movie-theater-room', 'boolean', 'facility', 5, true),
    (cat_recreation_id, 'Music Room', 'music-room', 'boolean', 'facility', 6, true);

    -- 8. Pets
    INSERT INTO room_field_categories (name, slug, display_order, section, column_number)
    VALUES ('Pets', 'pets-facility', 80, 'location_details', 3)
    RETURNING id INTO cat_pets_id;

    INSERT INTO room_field_definitions (category_id, name, slug, type, target_type, options, display_order, is_active)
    VALUES
    (cat_pets_id, 'Pets Allowed', 'pets-allowed-facility', 'single', 'facility', '["No Pets Allowed", "Indoor Cats Allowed", "Indoor Dogs Allowed", "Indoor Birds Allowed", "Outdoor Cats Allowed", "Outdoor Dogs Allowed", "Outdoor Birds Allowed", "Indoor/Outdoor Cats Allowed", "Indoor/Outdoor Dogs Allowed", "Indoor/Outdoor Birds Allowed"]', 1, true);

END $$;
