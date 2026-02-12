-- Backfill display_order for taxonomy_entries based on alphabetical order
-- Only for top-level entries (parent_id IS NULL) since children always sort alphabetically

WITH ranked AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY taxonomy_id
            ORDER BY name ASC
        ) - 1 AS new_order
    FROM taxonomy_entries
    WHERE parent_id IS NULL
)
UPDATE taxonomy_entries te
SET display_order = ranked.new_order
FROM ranked
WHERE te.id = ranked.id;
