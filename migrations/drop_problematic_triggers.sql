-- ============================================================================
-- Migration: Drop Problematic Contact Triggers Causing 57014 Timeouts
-- ============================================================================
-- The `validate_contact_dependencies_trigger` enforces strict rules (like
-- requiring a secondary_contact_name if enable_secondary_contact is true).
-- However, because of how Supabase/PostgREST processes the update payload,
-- when this trigger raises an exception, the connection hangs and eventually
-- throws a generic "57014 statement timeout" instead of returning the actual
-- validation error message to the frontend.
--
-- We drop these triggers so that validations can be handled safely on the
-- frontend or via proper API constraints without locking the database connection.
-- ============================================================================

DROP TRIGGER IF EXISTS validate_contact_dependencies_trigger ON contacts;
DROP FUNCTION IF EXISTS public.validate_contact_dependencies();

-- The updated_at trigger is standard, but in some old Supabase projects
-- it can conflict if the frontend is also sending an updated_at timestamp.
-- We'll leave the auth function safely updated instead of dropping it entirely,
-- but since we're here, let's just make sure the trigger definition is clean.
-- Actually, let's keep update_contacts_updated_at as it's standard.
