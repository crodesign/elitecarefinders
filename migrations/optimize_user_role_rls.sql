-- ============================================================================
-- Migration: Optimize get_user_role for RLS performance
-- ============================================================================
-- When get_user_role is used inside an RLS policy like:
-- USING (get_user_role(auth.uid()) = 'super_admin')
-- Postgres evaluates the function for EVERY single row scanned.
-- By changing it from VOLATILE (default) or STABLE to STABLE with 
-- an explicitly cached request setting, we prevent row-by-row lookups
-- causing statement timeouts on large tables like `contacts`.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _role text;
BEGIN
    -- 1. Check if we already cached the role in this transaction/request
    _role := current_setting('request.jwt.claims', true)::jsonb ->> 'user_role';
    
    -- 2. If it's cached in the JWT, return it immediately (ultra fast)
    IF _role IS NOT NULL AND _role <> '' THEN
        RETURN _role;
    END IF;

    -- 3. Otherwise, query the database (slower table lookup)
    SELECT role::text INTO _role
    FROM public.user_roles
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(_role, 'none');
END;
$$;
