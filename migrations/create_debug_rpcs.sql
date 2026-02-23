-- ============================================================================
-- Migration: Create Debug RPCs for 57014 Statement Timeout
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_get_contacts_triggers()
RETURNS TABLE(trigger_name name, trigger_def text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT tgname AS trigger_name, 
           pg_get_triggerdef(pg_trigger.oid) AS trigger_def
    FROM pg_trigger 
    JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid 
    WHERE pg_class.relname = 'contacts' AND tgname NOT LIKE 'RI_ConstraintTrigger%';
$$;

CREATE OR REPLACE FUNCTION public.debug_get_active_locks()
RETURNS TABLE(pid integer, relname name, transactionid xid, mode text, granted boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT l.pid, c.relname, l.transactionid, l.mode, l.granted
    FROM pg_locks l
    JOIN pg_class c ON l.relation = c.oid
    WHERE c.relname = 'contacts';
$$;
