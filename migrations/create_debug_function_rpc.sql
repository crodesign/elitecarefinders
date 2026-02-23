-- ============================================================================
-- Migration: Get specific function definition
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_get_function_src(func_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT prosrc FROM pg_proc WHERE proname = func_name;
$$;
