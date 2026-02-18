-- Create invoice_manager role if it doesn't exist (enum update usually requires separate handling, but assuming string check or extending existing enum)
-- Ideally update UserRole enum if it exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typcategory = 'E') THEN
        -- Create type if doesn't exist (fallback)
        CREATE TYPE user_role AS ENUM ('super_admin', 'system_admin', 'regional_manager', 'local_user', 'invoice_manager');
    ELSE
        -- Add value to enum if not exists
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'invoice_manager';
    END IF;
END $$;

-- 1. Policies for 'contacts' table

-- Enable RLS on contacts if not already (should be enabled)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Allow invoice_manager to VIEW contacts that are relevant (won, closed, or invoice activity)
-- Policy: invoice_manager_select_contacts
DROP POLICY IF EXISTS "invoice_manager_select_contacts" ON contacts;
CREATE POLICY "invoice_manager_select_contacts" ON contacts
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'user_role' = 'invoice_manager') AND 
        (
            care_level IN ('won', 'closed') OR 
            invoice_sent = true OR 
            invoice_received = true
        )
    );

-- Allow invoice_manager to UPDATE contacts (specifically for invoice fields)
-- For simplicity, allowing update on rows they can see. Ideally restrict columns but PG RLS on columns is not native in CREATE POLICY (only USING/WITH CHECK).
-- We will rely on UI to restrict fields, and backend triggers if needed, but for now simple update policy.
DROP POLICY IF EXISTS "invoice_manager_update_contacts" ON contacts;
CREATE POLICY "invoice_manager_update_contacts" ON contacts
    FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() ->> 'user_role' = 'invoice_manager') AND 
        (
            care_level IN ('won', 'closed') OR 
            invoice_sent = true OR 
            invoice_received = true
        )
    )
    WITH CHECK (
        (auth.jwt() ->> 'user_role' = 'invoice_manager')
    );

-- Note: user_role in JWT is a custom claim. If not present, we check public.user_roles table.
-- Improved Policy using user_roles table lookup if JWT claim is custom
-- Assuming a helper function `is_invoice_manager()` or similar exists or doing direct join

-- Let's create a secure helper function for role check to clean up policies
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text AS $$
DECLARE
  _role text;
BEGIN
  -- Try to get from JWT first
  _role := current_setting('request.jwt.claim.user_role', true);
  
  IF _role IS NULL THEN
    -- Fallback to table lookup
    SELECT role::text INTO _role
    FROM public.user_roles
    WHERE user_id = auth.uid();
  END IF;
  
  RETURN _role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create policies using the function

DROP POLICY IF EXISTS "invoice_manager_select_contacts" ON contacts;
CREATE POLICY "invoice_manager_select_contacts" ON contacts
    FOR SELECT
    TO authenticated
    USING (
        (public.auth_user_role() = 'invoice_manager') AND 
        (
            care_level IN ('won', 'closed') OR 
            invoice_sent = true OR 
            invoice_received = true
        )
         OR 
        (public.auth_user_role() IN ('super_admin', 'system_admin', 'regional_manager')) -- Existing admins see all
         OR
        (auth.uid() = user_id) -- Owner sees their own
    );

DROP POLICY IF EXISTS "invoice_manager_update_contacts" ON contacts;
CREATE POLICY "invoice_manager_update_contacts" ON contacts
    FOR UPDATE
    TO authenticated
    USING (
        (public.auth_user_role() = 'invoice_manager') AND 
        (
            care_level IN ('won', 'closed') OR 
            invoice_sent = true OR 
            invoice_received = true
        )
         OR 
        (public.auth_user_role() IN ('super_admin', 'system_admin', 'regional_manager'))
         OR
        (auth.uid() = user_id)
    );

-- Grant permissions to new role if needed (usually authenticated role covers it)
