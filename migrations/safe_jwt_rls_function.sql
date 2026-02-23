-- ============================================================================
-- Migration: Fix `current_setting` exception in `get_user_role_fast`
-- ============================================================================
-- The previous STABLE function used `current_setting('request.jwt.claims', true)`.
-- In some contexts (like direct database access or background workers), this
-- GUC variable is NOT SET at all. When `current_setting` fails, it raises
-- an exception. If it raises an exception during an RLS policy evaluation,
-- Postgres aborts the row scan but keeps the connection hanging, eventually
-- resulting in the 57014 statement timeout!
--
-- We add an EXCEPTION block to gracefully fallback to the auth table lookup.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role_fast(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _role text;
    _jwt text;
BEGIN
    -- 1. Safely try to get JWT claim. If request.jwt.claims is missing in this context,
    -- catch the exception and gracefully recover.
    BEGIN
        _jwt := current_setting('request.jwt.claims', true);
        IF _jwt IS NOT NULL THEN
            _role := _jwt::jsonb ->> 'user_role';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        _role := NULL;
    END;
    
    -- 2. If valid role found in JWT, return instantly
    IF _role IS NOT NULL AND _role <> '' THEN
        RETURN _role;
    END IF;

    -- 3. Fallback: Table lookup
    SELECT role::text INTO _role
    FROM public.user_roles
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(_role, 'none');
END;
$$;
