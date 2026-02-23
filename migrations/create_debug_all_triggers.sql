-- ============================================================================
-- Migration: Create Debug RPC to get all triggers on the contacts table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_get_all_triggers()
RETURNS TABLE(trigger_name name, trigger_def text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT tgname AS trigger_name, 
           pg_get_triggerdef(pg_trigger.oid) AS trigger_def
    FROM pg_trigger 
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
    WHERE pg_class.relname = 'contacts';
$$;
