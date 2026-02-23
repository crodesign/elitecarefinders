-- ============================================================================
-- Migration: Optimize contacts RLS policies to prevent 57014 Statement Timeout
-- ============================================================================
-- The previous policies used `get_user_role(auth.uid()) IN (...)` for every
-- single row in the contacts table. Because RLS evaluates row-by-row, this
-- executes the function thousands of times, causing severe performance issues
-- and statement timeouts (code 57014) when the table grows or when updating.
--
-- This migration replaces the function calls with an EXISTS() subquery that
-- natively joins against `user_roles`. Postgres can index and optimize EXISTS()
-- queries highly efficiently compared to function evaluations.
-- ============================================================================

-- Drop the function-based policies
DROP POLICY IF EXISTS "Admin select contacts" ON contacts;
DROP POLICY IF EXISTS "Admin update contacts" ON contacts;
DROP POLICY IF EXISTS "Admin delete contacts" ON contacts;
DROP POLICY IF EXISTS "Invoice manager select contacts" ON contacts;

-- 1. SELECT: Admins only (using EXISTS)
CREATE POLICY "Admin select contacts" ON contacts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'system_admin')
        )
    );

-- 2. UPDATE: Admins only (using EXISTS)
CREATE POLICY "Admin update contacts" ON contacts
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'system_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'system_admin')
        )
    );

-- 3. DELETE: Admins only (using EXISTS)
CREATE POLICY "Admin delete contacts" ON contacts
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'system_admin')
        )
    );

-- 4. SELECT: Invoice manager
CREATE POLICY "Invoice manager select contacts" ON contacts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role = 'invoice_manager'
        )
        AND (
            care_level IN ('won', 'closed')
            OR invoice_sent = true
            OR invoice_received = true
        )
    );
