-- Addresses Supabase advisor warnings:
--   1) function_search_path_mutable — pin search_path on all public functions
--   2) public_bucket_allows_listing — drop unused `media` storage bucket

-- -----------------------------------------------------------------------------
-- 1. Pin search_path on every function in the public schema.
--    Iterates pg_proc so we don't need to know each function's signature.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    fn record;
BEGIN
    FOR fn IN
        SELECT n.nspname AS schema_name,
               p.proname  AS func_name,
               pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
            fn.schema_name, fn.func_name, fn.args
        );
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Drop the overly-permissive SELECT policy on the unused `media` bucket.
--    App serves media from /public/images/media/ — Supabase Storage is not used.
--
--    NOTE: Supabase blocks direct DELETE on storage.objects / storage.buckets
--    (protect_delete trigger). Finish bucket removal in the dashboard:
--      Storage → media bucket → delete the lone orphan object → delete bucket.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Media Bucket Public Read" ON storage.objects;
