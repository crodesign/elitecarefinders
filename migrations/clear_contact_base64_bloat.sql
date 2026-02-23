-- ============================================================================
-- Migration: Clean up Base64 image bloat in contacts table
-- ============================================================================
-- The `contacts` table currently contains 15.19 MB of data across just 4 rows.
-- This is because a user accidentally pasted a raw Base64 image string (8MB+)
-- into the `personal_care_assistance` text field.
-- 
-- This script safely clears out any text field that exceeds 50,000 characters
-- (which is impossible for human-typed notes and definitively an embedded blob)
-- to restore the table's performance to sub-millisecond speeds.
-- ============================================================================

UPDATE public.contacts
SET 
  personal_care_assistance = CASE WHEN length(personal_care_assistance) > 50000 THEN '[Image removed for performance]' ELSE personal_care_assistance END,
  additional_notes = CASE WHEN length(additional_notes) > 50000 THEN '[Image removed for performance]' ELSE additional_notes END,
  care_additional_notes = CASE WHEN length(care_additional_notes) > 50000 THEN '[Image removed for performance]' ELSE care_additional_notes END,
  housing_additional_notes = CASE WHEN length(housing_additional_notes) > 50000 THEN '[Image removed for performance]' ELSE housing_additional_notes END,
  diagnoses = CASE WHEN length(diagnoses) > 50000 THEN '[Image removed for performance]' ELSE diagnoses END,
  looking_for = CASE WHEN length(looking_for) > 50000 THEN '[Image removed for performance]' ELSE looking_for END
WHERE 
  length(personal_care_assistance) > 50000 OR
  length(additional_notes) > 50000 OR
  length(care_additional_notes) > 50000 OR
  length(housing_additional_notes) > 50000 OR
  length(diagnoses) > 50000 OR
  length(looking_for) > 50000;
