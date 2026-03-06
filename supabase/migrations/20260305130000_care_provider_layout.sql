-- ── Column assignments ─────────────────────────────────────────────────────

UPDATE public.room_field_categories
SET column_number = 1
WHERE section = 'care_provider_details'
  AND name ILIKE '%Provider Information%';

UPDATE public.room_field_categories
SET column_number = 2
WHERE section = 'care_provider_details'
  AND name ILIKE '%About Care Provider%';

UPDATE public.room_field_categories
SET column_number = 2
WHERE section = 'care_provider_details'
  AND name ILIKE '%Skills%Specialties%';

-- ── Field display order within Provider Information (col 1) ────────────────

UPDATE public.room_field_definitions
SET display_order = 10
WHERE name ILIKE '%Care Provider Title%'
  AND category_id = (
      SELECT id FROM public.room_field_categories
      WHERE section = 'care_provider_details' AND name ILIKE '%Provider Information%'
      LIMIT 1
  );

UPDATE public.room_field_definitions
SET display_order = 20
WHERE name ILIKE '%Care Provider Gender%'
  AND category_id = (
      SELECT id FROM public.room_field_categories
      WHERE section = 'care_provider_details' AND name ILIKE '%Provider Information%'
      LIMIT 1
  );

UPDATE public.room_field_definitions
SET display_order = 30
WHERE name ILIKE '%Number on Staff%'
  AND category_id = (
      SELECT id FROM public.room_field_categories
      WHERE section = 'care_provider_details' AND name ILIKE '%Provider Information%'
      LIMIT 1
  );

UPDATE public.room_field_definitions
SET display_order = 40
WHERE name ILIKE '%Care Provider Hours%'
  AND category_id = (
      SELECT id FROM public.room_field_categories
      WHERE section = 'care_provider_details' AND name ILIKE '%Provider Information%'
      LIMIT 1
  );

-- ── Verify results ─────────────────────────────────────────────────────────

SELECT c.name AS category, c.column_number, c.display_order,
       d.name AS field, d.display_order AS field_order
FROM public.room_field_categories c
LEFT JOIN public.room_field_definitions d ON d.category_id = c.id
WHERE c.section = 'care_provider_details'
ORDER BY c.column_number, c.display_order, d.display_order;
