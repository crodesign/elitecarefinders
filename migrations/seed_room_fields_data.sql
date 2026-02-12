-- Seed fixed field options from WordPress
-- Bedroom Types
INSERT INTO room_fixed_field_options (field_type, value, display_order) VALUES
    ('bedroom', 'Private', 1),
    ('bedroom', 'Shared', 2),
    ('bedroom', 'Studio', 3);

-- Bathroom Types
INSERT INTO room_fixed_field_options (field_type, value, display_order) VALUES
    ('bathroom', 'Private', 1),
    ('bathroom', 'Shared', 2),
    ('bathroom', 'Jack & Jill', 3);

-- Shower Types
INSERT INTO room_fixed_field_options (field_type, value, display_order) VALUES
    ('shower', 'Walk-in', 1),
    ('shower', 'Tub/Shower Combo', 2),
    ('shower', 'Roll-in', 3);

-- Room Types
INSERT INTO room_fixed_field_options (field_type, value, display_order) VALUES
    ('roomType', 'Studio', 1),
    ('roomType', 'One Bedroom', 2),
    ('roomType', 'Two Bedroom', 3);

-- Seed categories
INSERT INTO room_field_categories (id, name, slug, display_order) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Room Amenities', 'room-amenities', 1),
    ('a1000000-0000-0000-0000-000000000002', 'Furnishings', 'furnishings', 2),
    ('a1000000-0000-0000-0000-000000000003', 'Kitchen', 'kitchen', 3),
    ('a1000000-0000-0000-0000-000000000004', 'Outdoor & Access', 'outdoor-access', 4),
    ('a1000000-0000-0000-0000-000000000005', 'Accessibility', 'accessibility', 5),
    ('a1000000-0000-0000-0000-000000000006', 'Pets', 'pets', 6);

-- Seed field definitions
-- Room Amenities
INSERT INTO room_field_definitions (name, slug, type, category_id, display_order) VALUES
    ('Air Conditioning', 'air-conditioning', 'boolean', 'a1000000-0000-0000-0000-000000000001', 1),
    ('Television', 'television', 'boolean', 'a1000000-0000-0000-0000-000000000001', 2),
    ('WiFi Included', 'wifi-included', 'boolean', 'a1000000-0000-0000-0000-000000000001', 3),
    ('Ceiling Fan', 'ceiling-fan', 'boolean', 'a1000000-0000-0000-0000-000000000001', 4),
    ('Night Stand with Lamp', 'night-stand-lamp', 'boolean', 'a1000000-0000-0000-0000-000000000001', 5);

-- Furnishings
INSERT INTO room_field_definitions (name, slug, type, category_id, display_order) VALUES
    ('Hospital Bed', 'hospital-bed', 'boolean', 'a1000000-0000-0000-0000-000000000002', 1),
    ('Sitting Area', 'sitting-area', 'boolean', 'a1000000-0000-0000-0000-000000000002', 2),
    ('Desk', 'desk', 'boolean', 'a1000000-0000-0000-0000-000000000002', 3),
    ('Dresser', 'dresser', 'boolean', 'a1000000-0000-0000-0000-000000000002', 4);

-- Kitchen
INSERT INTO room_field_definitions (name, slug, type, category_id, display_order) VALUES
    ('Full Kitchen', 'full-kitchen', 'boolean', 'a1000000-0000-0000-0000-000000000003', 1),
    ('Kitchenette', 'kitchenette', 'boolean', 'a1000000-0000-0000-0000-000000000003', 2);

-- Outdoor & Access
INSERT INTO room_field_definitions (name, slug, type, category_id, display_order) VALUES
    ('Private Lanai/Patio/Balcony', 'private-lanai', 'boolean', 'a1000000-0000-0000-0000-000000000004', 1),
    ('Ground Floor Units', 'ground-floor', 'boolean', 'a1000000-0000-0000-0000-000000000004', 2),
    ('Secured Gate Access', 'secured-gate', 'boolean', 'a1000000-0000-0000-0000-000000000004', 3),
    ('Fenced In Perimeter', 'fenced-perimeter', 'boolean', 'a1000000-0000-0000-0000-000000000004', 4);

-- Accessibility
INSERT INTO room_field_definitions (name, slug, type, category_id, display_order) VALUES
    ('Accommodates Wheelchair', 'wheelchair', 'boolean', 'a1000000-0000-0000-0000-000000000005', 1),
    ('Transportation Options', 'transportation', 'boolean', 'a1000000-0000-0000-0000-000000000005', 2),
    ('Owns Handicap Transport Van', 'handicap-van', 'boolean', 'a1000000-0000-0000-0000-000000000005', 3);

-- Pets
INSERT INTO room_field_definitions (name, slug, type, options, category_id, display_order) VALUES
    ('Pet Friendly', 'pet-friendly', 'single', '["No", "Cats Only", "Dogs Only", "Cats & Dogs"]', 'a1000000-0000-0000-0000-000000000006', 1);
