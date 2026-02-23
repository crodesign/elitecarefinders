-- Drop the existing policy
DROP POLICY IF EXISTS "Public insert contacts" ON contacts;

-- Recreate with the loosened first_name check so public form submissions 
-- with only a single name don't fail RLS.
CREATE POLICY "Public insert contacts" ON contacts
    FOR INSERT
    WITH CHECK (
        first_name IS NOT NULL
        AND first_name <> ''
        AND (email IS NOT NULL OR phone IS NOT NULL)
    );
