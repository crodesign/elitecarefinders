-- Unify facilities taxonomy column: rename taxonomy_ids → taxonomy_entry_ids
-- Matches the pattern used by homes (taxonomy_entry_ids) and fixes misleading naming.
-- taxonomy_ids was storing taxonomy_entry IDs all along — this makes it explicit.

-- 1. Add the correctly-named column
ALTER TABLE facilities
    ADD COLUMN IF NOT EXISTS taxonomy_entry_ids uuid[];

-- 2. Copy existing data
UPDATE facilities
SET taxonomy_entry_ids = taxonomy_ids
WHERE taxonomy_ids IS NOT NULL;

-- 3. Recreate search function using taxonomy_entry_ids
CREATE OR REPLACE FUNCTION search_facilities(keyword text)
RETURNS SETOF facilities LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT f.* FROM facilities f
  WHERE
    f.title ilike '%' || keyword || '%' OR
    f.slug ilike '%' || keyword || '%' OR
    coalesce(f.description, '') ilike '%' || keyword || '%' OR
    coalesce(f.license_number, '') ilike '%' || keyword || '%' OR
    coalesce(f.capacity::text, '') ilike '%' || keyword || '%' OR
    coalesce(f.address->>'city', '') ilike '%' || keyword || '%' OR
    coalesce(f.address->>'street', '') ilike '%' || keyword || '%' OR
    coalesce(f.address->>'state', '') ilike '%' || keyword || '%' OR
    coalesce(f.address->>'zip', '') ilike '%' || keyword || '%' OR
    f.status::text ilike '%' || keyword || '%' OR
    EXISTS (
      SELECT 1 FROM taxonomy_entries te
      WHERE te.id = ANY(f.taxonomy_entry_ids)
      AND te.name ilike '%' || keyword || '%'
    );
END;
$$;

-- 4. Update RLS policy for facilities to use taxonomy_entry_ids
DROP POLICY IF EXISTS "Users can update accessible facilities" ON facilities;

CREATE POLICY "Users can update accessible facilities" ON facilities
    FOR UPDATE
    TO authenticated
    USING (
        can_access_content(created_by)
        AND
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'location_manager')
                AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
            )
        )
    )
    WITH CHECK (
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'location_manager')
                AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
            )
        )
    );

-- Note: taxonomy_ids is intentionally kept for now to avoid breaking any
-- existing DB triggers or policies not covered here. It can be dropped once
-- confirmed stable. To drop later:
--   ALTER TABLE facilities DROP COLUMN taxonomy_ids;
