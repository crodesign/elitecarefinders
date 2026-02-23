-- ============================================================================
-- Migration: Create Debug RPC to find missing Foreign Key indexes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_get_missing_fk_indexes()
RETURNS TABLE(
    table_name text,
    constraint_name text,
    column_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH fk_actions (id, action) AS (
  VALUES (1, 'RESTRICT'), (2, 'CASCADE'), (3, 'SET NULL'), (4, 'SET DEFAULT'), (5, 'RESTRICT')
),
fk_constraints AS (
  SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
),
indexed_columns AS (
  SELECT
    t.relname AS table_name,
    a.attname AS column_name
  FROM pg_class t
  JOIN pg_index i ON t.oid = i.indrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
  WHERE t.relkind = 'r'
)
SELECT 
  f.table_name::text, 
  f.constraint_name::text, 
  f.column_name::text
FROM fk_constraints f
LEFT JOIN indexed_columns i
  ON f.table_name = i.table_name 
  AND f.column_name = i.column_name
WHERE i.column_name IS NULL;
$$;
