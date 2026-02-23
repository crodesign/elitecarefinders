-- ============================================================================
-- Migration: Fix Supabase Security Advisor Warnings
-- ============================================================================
-- Addresses:
--   1. function_search_path_mutable — 8 functions
--   2. rls_policy_always_true       — 10 policies across 7 tables
-- ============================================================================


-- ============================================================================
-- PART 1: FIX MUTABLE SEARCH PATHS ON ALL FLAGGED FUNCTIONS
-- Prevents search_path injection attacks by locking functions to `public`.
-- ============================================================================

ALTER FUNCTION public.can_access_content(UUID)       SET search_path = public, pg_temp;
ALTER FUNCTION public.search_contacts(text)           SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_role(UUID)             SET search_path = public, pg_temp;
ALTER FUNCTION public.track_note_edits()              SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at()                SET search_path = public, pg_temp;
ALTER FUNCTION public.get_all_used_image_urls()       SET search_path = public, pg_temp;
ALTER FUNCTION public.can_edit_by_location(UUID, UUID[]) SET search_path = public, pg_temp;

-- auth_user_role: fix if it exists (may be a view alias or inline function)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'auth_user_role'
    ) THEN
        EXECUTE 'ALTER FUNCTION public.auth_user_role() SET search_path = public, pg_temp';
    END IF;
END $$;


-- ============================================================================
-- PART 2: FIX OVERLY PERMISSIVE RLS POLICIES
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 2a. contact_history — full lockdown to admins
-- Contact history is sensitive — lock all access to super/system admins.
-- INSERT is allowed for authenticated users (the app writes history server-side
-- when a contact is saved, using the current user's session).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read contact history"   ON contact_history;
DROP POLICY IF EXISTS "Authenticated users can create contact history" ON contact_history;
DROP POLICY IF EXISTS "Authenticated users can update contact history" ON contact_history;

-- SELECT: admins only
CREATE POLICY "Admin read contact history" ON contact_history
    FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

-- INSERT: authenticated users can write their own history entries
CREATE POLICY "Auth insert contact history" ON contact_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: admins only
CREATE POLICY "Admin update contact history" ON contact_history
    FOR UPDATE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    )
    WITH CHECK (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

-- Also lock notes SELECT to admins (notes belong to contacts)
DROP POLICY IF EXISTS "Authenticated users can read notes" ON notes;

CREATE POLICY "Admin read notes" ON notes
    FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );


-- ----------------------------------------------------------------------------
-- 2b. contacts — full policy lockdown
-- Only super_admin and system_admin can access the Contacts section.
-- Public INSERT remains for the contact form — but requires core fields.
-- Drop all legacy permissive / role-expanding policies first.
-- ----------------------------------------------------------------------------

-- Drop all existing contacts policies so we start clean
DROP POLICY IF EXISTS "Allow public form submissions"         ON contacts;
DROP POLICY IF EXISTS "invoice_manager_select_contacts"       ON contacts;
DROP POLICY IF EXISTS "invoice_manager_update_contacts"       ON contacts;
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can manage contacts"            ON contacts;
DROP POLICY IF EXISTS "Anyone can insert contact"             ON contacts;

-- SELECT: admins only
CREATE POLICY "Admin select contacts" ON contacts
    FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

-- INSERT: public form keeps working — require minimum valid fields to block spam
CREATE POLICY "Public insert contacts" ON contacts
    FOR INSERT
    WITH CHECK (
        first_name IS NOT NULL
        AND first_name <> ''
        AND (email IS NOT NULL OR phone IS NOT NULL)
    );

-- UPDATE: admins only
CREATE POLICY "Admin update contacts" ON contacts
    FOR UPDATE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    )
    WITH CHECK (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

-- DELETE: admins only
CREATE POLICY "Admin delete contacts" ON contacts
    FOR DELETE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

-- SELECT: invoice_manager can see invoice-relevant contacts (won/closed, or invoiced)
CREATE POLICY "Invoice manager select contacts" ON contacts
    FOR SELECT
    TO authenticated
    USING (
        get_user_role(auth.uid()) = 'invoice_manager'
        AND (
            care_level IN ('won', 'closed')
            OR invoice_sent = true
            OR invoice_received = true
        )
    );

-- UPDATE: invoice_manager can update invoice-relevant contacts
CREATE POLICY "Invoice manager update contacts" ON contacts
    FOR UPDATE
    TO authenticated
    USING (
        get_user_role(auth.uid()) = 'invoice_manager'
        AND (
            care_level IN ('won', 'closed')
            OR invoice_sent = true
            OR invoice_received = true
        )
    )
    WITH CHECK (
        get_user_role(auth.uid()) = 'invoice_manager'
    );


-- ----------------------------------------------------------------------------
-- 2c. media_folders — INSERT / UPDATE / DELETE policies
-- Old: WITH CHECK (true) / USING (true) for all authenticated users
-- New: Restrict write access to admins only.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth insert folders" ON media_folders;
DROP POLICY IF EXISTS "Auth update folders" ON media_folders;
DROP POLICY IF EXISTS "Auth delete folders" ON media_folders;

CREATE POLICY "Auth insert folders" ON media_folders
    FOR INSERT
    TO authenticated
    WITH CHECK (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

CREATE POLICY "Auth update folders" ON media_folders
    FOR UPDATE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    )
    WITH CHECK (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

CREATE POLICY "Auth delete folders" ON media_folders
    FOR DELETE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );


-- ----------------------------------------------------------------------------
-- 2d. media_items — INSERT / UPDATE / DELETE policies
-- Old: WITH CHECK (true) / USING (true) for all authenticated users
-- New: Restrict write access to admins only.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth insert items" ON media_items;
DROP POLICY IF EXISTS "Auth update items" ON media_items;
DROP POLICY IF EXISTS "Auth delete items" ON media_items;

CREATE POLICY "Auth insert items" ON media_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

CREATE POLICY "Auth update items" ON media_items
    FOR UPDATE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    )
    WITH CHECK (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );

CREATE POLICY "Auth delete items" ON media_items
    FOR DELETE
    TO authenticated
    USING (
        get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
    );


-- ----------------------------------------------------------------------------
-- 2e. room_field_categories / room_field_definitions / room_fixed_field_options
-- Old: Full public (anon + authenticated) ALL access — left over from dev
-- New: Public read-only; authenticated admins can write.
-- ----------------------------------------------------------------------------

-- room_field_categories
DROP POLICY IF EXISTS "Allow full public access to room_field_categories" ON room_field_categories;

CREATE POLICY "Public read room_field_categories" ON room_field_categories
    FOR SELECT USING (true);

CREATE POLICY "Admin write room_field_categories" ON room_field_categories
    FOR ALL
    TO authenticated
    USING (get_user_role(auth.uid()) IN ('super_admin', 'system_admin'))
    WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'system_admin'));

-- room_field_definitions
DROP POLICY IF EXISTS "Allow full public access to room_field_definitions" ON room_field_definitions;

CREATE POLICY "Public read room_field_definitions" ON room_field_definitions
    FOR SELECT USING (true);

CREATE POLICY "Admin write room_field_definitions" ON room_field_definitions
    FOR ALL
    TO authenticated
    USING (get_user_role(auth.uid()) IN ('super_admin', 'system_admin'))
    WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'system_admin'));

-- room_fixed_field_options
DROP POLICY IF EXISTS "Allow full public access to room_fixed_field_options" ON room_fixed_field_options;

CREATE POLICY "Public read room_fixed_field_options" ON room_fixed_field_options
    FOR SELECT USING (true);

CREATE POLICY "Admin write room_fixed_field_options" ON room_fixed_field_options
    FOR ALL
    TO authenticated
    USING (get_user_role(auth.uid()) IN ('super_admin', 'system_admin'))
    WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'system_admin'));


-- ----------------------------------------------------------------------------
-- 2f. room_fixed_field_types — ALL authenticated unrestricted
-- Old: ALL TO authenticated USING (true) WITH CHECK (true)
-- New: Restrict to admins for write; authenticated can still read.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable insert/update for authenticated users" ON room_fixed_field_types;

CREATE POLICY "Authenticated read room_fixed_field_types" ON room_fixed_field_types
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin write room_fixed_field_types" ON room_fixed_field_types
    FOR ALL
    TO authenticated
    USING (get_user_role(auth.uid()) IN ('super_admin', 'system_admin'))
    WITH CHECK (get_user_role(auth.uid()) IN ('super_admin', 'system_admin'));


-- ----------------------------------------------------------------------------
-- 2g. taxonomies / taxonomy_entries — anonymous write access
-- These overly-permissive anon ALL policies were dev scaffolding.
-- Proper authenticated-admin write policies already exist from fix_taxonomy_rls.sql.
-- We just drop the offending anon policies.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous write access to taxonomies" ON taxonomies;
DROP POLICY IF EXISTS "Allow anonymous write access to taxonomy_entries" ON taxonomy_entries;


-- ============================================================================
-- DONE
-- ============================================================================
-- Remaining items that require Supabase Dashboard action (no SQL possible):
--   • Leaked Password Protection → Auth → Password Security → Enable
--   • Postgres Version Upgrade   → Dashboard → Database → Upgrade
-- ============================================================================
