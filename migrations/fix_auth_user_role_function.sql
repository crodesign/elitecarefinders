-- ============================================================================
-- Fix: is_admin() and is_invoice_manager() referencing non-existent public.app_role
-- ============================================================================
-- These functions were created referencing a `public.app_role` enum type and a
-- `public.has_role()` helper that were never properly created in this database.
-- After setting search_path = public on all functions, Postgres tries to resolve
-- them eagerly and throws: type "public.app_role" does not exist (error 42704).
-- Fix: replace both functions with simple text-based lookups against user_roles.
-- ============================================================================

-- Drop the broken app_role-dependent functions
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_invoice_manager();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'system_admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_invoice_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'invoice_manager'
    );
$$;

-- ============================================================================
-- Fix: auth_user_role function breaking with "type public.app_role does not exist"
-- ============================================================================
-- After setting search_path = public, pg_temp on auth_user_role, Postgres
-- is unable to resolve the internal app_role enum type (from the enum created 
-- in add_invoice_manager_rls.sql). We recreate the function using plain TEXT
-- to avoid any enum type dependency.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _role text;
BEGIN
    -- Try JWT claim first (fastest)
    _role := current_setting('request.jwt.claims', true)::jsonb ->> 'user_role';

    -- Fallback: direct table lookup (works for all auth methods)
    IF _role IS NULL OR _role = '' THEN
        SELECT role::text INTO _role
        FROM public.user_roles
        WHERE user_id = auth.uid();
    END IF;

    RETURN _role;
END;
$$;
