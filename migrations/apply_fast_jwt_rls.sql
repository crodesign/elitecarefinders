-- ============================================================================
-- Migration: Revert contacts RLS to use ultra-fast STABLE JWT function
-- ============================================================================
-- PostgreSQL row-level security can sometimes execute `EXISTS` subqueries
-- extremely poorly during `UPDATE` statements by refusing to push the `WHERE id = ...` filter
-- down until AFTER it does a sequential scan evaluated against the policy.
--
-- By defining `get_user_role` as STABLE and making it read from the
-- memory-cached `request.jwt.claims` inside PostgREST, we completely bypass
-- all table joins for RLS checks, returning the authorization instantly.
-- ============================================================================

-- 1. Create the fast STABLE function
CREATE OR REPLACE FUNCTION public.get_user_role_fast(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _role text;
BEGIN
    -- 1. Check if we already cached the role in this transaction/request (Insta-fast)
    _role := current_setting('request.jwt.claims', true)::jsonb ->> 'user_role';
    
    IF _role IS NOT NULL AND _role <> '' THEN
        RETURN _role;
    END IF;

    -- 2. Fallback to table if JWT is missing the claim
    SELECT role::text INTO _role
    FROM public.user_roles
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(_role, 'none');
END;
$$;

-- 2. Drop the slow EXISTS-based policies
DROP POLICY IF EXISTS "Admin select contacts" ON contacts;
DROP POLICY IF EXISTS "Admin update contacts" ON contacts;
DROP POLICY IF EXISTS "Admin delete contacts" ON contacts;
DROP POLICY IF EXISTS "Invoice manager select contacts" ON contacts;
DROP POLICY IF EXISTS "Invoice manager update contacts" ON contacts;
DROP POLICY IF EXISTS "Authenticated users view access" ON contacts;
DROP POLICY IF EXISTS "Authenticated users update access" ON contacts;
DROP POLICY IF EXISTS "Owner or admin delete access" ON contacts;


-- 3. Apply the fast function to all policies
CREATE POLICY "Admin select contacts" ON contacts
    FOR SELECT TO authenticated
    USING ( get_user_role_fast(auth.uid()) IN ('super_admin', 'system_admin') );

CREATE POLICY "Admin update contacts" ON contacts
    FOR UPDATE TO authenticated
    USING ( get_user_role_fast(auth.uid()) IN ('super_admin', 'system_admin') )
    WITH CHECK ( get_user_role_fast(auth.uid()) IN ('super_admin', 'system_admin') );

CREATE POLICY "Admin delete contacts" ON contacts
    FOR DELETE TO authenticated
    USING ( get_user_role_fast(auth.uid()) IN ('super_admin', 'system_admin') );

CREATE POLICY "Invoice manager select contacts" ON contacts
    FOR SELECT TO authenticated
    USING (
        get_user_role_fast(auth.uid()) = 'invoice_manager'
        AND (
            care_level IN ('won', 'closed')
            OR invoice_sent = true
            OR invoice_received = true
        )
    );

CREATE POLICY "Invoice manager update contacts" ON contacts
    FOR UPDATE TO authenticated
    USING (
        get_user_role_fast(auth.uid()) = 'invoice_manager'
        AND (
            care_level IN ('won', 'closed')
            OR invoice_sent = true
            OR invoice_received = true
        )
    )
    WITH CHECK (
        get_user_role_fast(auth.uid()) = 'invoice_manager'
    );
