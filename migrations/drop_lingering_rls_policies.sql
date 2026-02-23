-- ============================================================================
-- Migration: Drop lingering unoptimized RLS policies on contacts
-- ============================================================================
-- The previous optimization script missed a few legacy policies because
-- their exact names didn't match the DROP IF EXISTS commands.
-- These remaining policies still use row-by-row function evaluation
-- (`is_admin()`, `get_user_role()`), which was actively causing the
-- 57014 canceling statement due to statement timeout.
--
-- We drop them here so only the highly-optimized `Admin ... contacts`
-- policies remain active.
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users view access" ON contacts;
DROP POLICY IF EXISTS "Authenticated users update access" ON contacts;
DROP POLICY IF EXISTS "Owner or admin delete access" ON contacts;
DROP POLICY IF EXISTS "Invoice manager update contacts" ON contacts;

-- Just to be safe, recreate the optimized Invoice Manager update policy manually
-- to replace the trailing unoptimized one we just dropped.
CREATE POLICY "Invoice manager update contacts" ON contacts
    FOR UPDATE
    TO authenticated
    USING (
         EXISTS ( SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'invoice_manager' )
         AND (
             care_level IN ('won', 'closed')
             OR invoice_sent = true
             OR invoice_received = true
         )
    )
    WITH CHECK (
         EXISTS ( SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'invoice_manager' )
    );
