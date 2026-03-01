-- Migration: Add location_manager role and entity-based local_user
-- 1. Renames existing local_user → location_manager
-- 2. Adds new local_user role assigned to specific homes/facilities

-- ============================================================================
-- 1. UPDATE ROLE CHECK CONSTRAINT
-- ============================================================================

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check
    CHECK (role IN ('super_admin', 'system_admin', 'regional_manager', 'location_manager', 'local_user', 'invoice_manager'));

-- Migrate existing local_user records to location_manager
UPDATE user_roles SET role = 'location_manager' WHERE role = 'local_user';

-- ============================================================================
-- 2. UPDATE get_user_role FUNCTION (if it exists)
-- ============================================================================

-- The function just reads from user_roles, no body changes needed.
-- can_edit_by_location() needs updating to reference location_manager.

CREATE OR REPLACE FUNCTION can_edit_by_location(uid UUID, location_ids UUID[])
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM user_roles WHERE user_id = uid;

    IF user_role IN ('super_admin', 'system_admin') THEN
        RETURN true;
    END IF;

    IF user_role = 'regional_manager' THEN
        RETURN EXISTS (
            SELECT 1
            FROM user_location_assignments ula
            WHERE ula.user_id = uid
            AND ula.location_id = ANY(location_ids)
        );
    END IF;

    IF user_role = 'location_manager' THEN
        RETURN EXISTS (
            SELECT 1
            FROM user_location_assignments ula
            WHERE ula.user_id = uid
            AND ula.location_id = ANY(location_ids)
        );
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CREATE user_entity_assignments TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_entity_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('home', 'facility')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, entity_id, entity_type)
);

ALTER TABLE user_entity_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entity assignments"
    ON user_entity_assignments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Managers can manage entity assignments"
    ON user_entity_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('super_admin', 'system_admin', 'regional_manager', 'location_manager')
        )
    );

CREATE INDEX IF NOT EXISTS idx_user_entity_assignments_user_id ON user_entity_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entity_assignments_entity_id ON user_entity_assignments(entity_id);

-- ============================================================================
-- 4. ENTITY-BASED EDIT HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION can_edit_by_entity(uid UUID, eid UUID, etype TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM user_roles WHERE user_id = uid;

    IF user_role IN ('super_admin', 'system_admin', 'regional_manager', 'location_manager') THEN
        RETURN true;
    END IF;

    IF user_role = 'local_user' THEN
        RETURN EXISTS (
            SELECT 1 FROM user_entity_assignments
            WHERE user_id = uid
            AND entity_id = eid
            AND entity_type = etype
        );
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. UPDATE HOMES RLS TO ALLOW local_user VIA ENTITY ASSIGNMENT
-- ============================================================================

DROP POLICY IF EXISTS "Local users can update assigned homes" ON homes;
CREATE POLICY "Local users can update assigned homes" ON homes
    FOR UPDATE
    USING (can_edit_by_entity(auth.uid(), id, 'home'));

-- ============================================================================
-- 6. UPDATE FACILITIES RLS TO ALLOW local_user VIA ENTITY ASSIGNMENT
-- ============================================================================

DROP POLICY IF EXISTS "Local users can update assigned facilities" ON facilities;
CREATE POLICY "Local users can update assigned facilities" ON facilities
    FOR UPDATE
    USING (can_edit_by_entity(auth.uid(), id, 'facility'));
