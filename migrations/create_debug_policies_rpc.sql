-- ============================================================================
-- Migration: Create Debug RPC to list all policies on a table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_get_policies(table_name text)
RETURNS TABLE(polname name, polcmd text, polqual text, polwithcheck text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        p.polname, 
        p.polcmd::text, 
        pg_get_expr(p.polqual, p.polrelid) AS polqual, 
        pg_get_expr(p.polwithcheck, p.polrelid) AS polwithcheck
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = table_name;
$$;
