-- Fix RLS policies for homes, facilities, media_folders, media_items
-- Ensures authenticated users can perform all CRUD operations

-- ═══════ HOMES ═══════
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'homes') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON homes';
    END LOOP;
END $$;

ALTER TABLE homes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage homes"
    ON homes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can read published homes"
    ON homes FOR SELECT TO anon USING (status = 'published');


-- ═══════ FACILITIES ═══════
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'facilities') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON facilities';
    END LOOP;
END $$;

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage facilities"
    ON facilities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public can read published facilities"
    ON facilities FOR SELECT TO anon USING (status = 'published');


-- ═══════ MEDIA_FOLDERS ═══════
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'media_folders') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON media_folders';
    END LOOP;
END $$;

ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage media folders"
    ON media_folders FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ═══════ MEDIA_ITEMS ═══════
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'media_items') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON media_items';
    END LOOP;
END $$;

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage media items"
    ON media_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
