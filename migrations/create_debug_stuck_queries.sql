-- ============================================================================
-- Migration: Create Debug RPC to check stuck queries and locks
-- ============================================================================

CREATE OR REPLACE FUNCTION public.debug_get_stuck_activity()
RETURNS TABLE(pid integer, state text, query_start timestamp with time zone, wait_event_type text, wait_event text, query text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        pid, 
        state, 
        query_start, 
        wait_event_type, 
        wait_event,
        substr(query, 1, 100) as query
    FROM pg_stat_activity 
    WHERE state != 'idle' 
      AND pid != pg_backend_pid()
    ORDER BY query_start ASC NULLS LAST;
$$;

CREATE OR REPLACE FUNCTION public.debug_get_blocking_locks()
RETURNS TABLE(blocked_pid integer, blocking_pid integer, blocked_query text, blocking_query text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        blocked_activity.pid AS blocked_pid,
        blocking_activity.pid AS blocking_pid,
        substr(blocked_activity.query, 1, 50) AS blocked_query,
        substr(blocking_activity.query, 1, 50) AS blocking_query
    FROM pg_catalog.pg_locks blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
    JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
    WHERE NOT blocked_locks.granted;
$$;
