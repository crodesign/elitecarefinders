-- ============================================================================
-- CONTACT HISTORY TABLE
-- Tracks changes made to contact records over time.
-- Each row represents one day's worth of changes to a contact.
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    change_date DATE NOT NULL DEFAULT CURRENT_DATE,
    changes_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- Deduplicate existing rows before adding the unique constraint.
-- Keep the most recently created entry per (contact_id, change_date).
-- ============================================================================
DELETE FROM contact_history
WHERE id NOT IN (
    SELECT DISTINCT ON (contact_id, change_date) id
    FROM contact_history
    ORDER BY contact_id, change_date, created_at DESC
);

-- Unique constraint: one history entry per contact per day
ALTER TABLE contact_history
    DROP CONSTRAINT IF EXISTS contact_history_contact_date_unique;
ALTER TABLE contact_history
    ADD CONSTRAINT contact_history_contact_date_unique
    UNIQUE (contact_id, change_date);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_contact_history_contact_id
    ON contact_history(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_history_change_date
    ON contact_history(change_date);

-- Enable RLS
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all history entries
DROP POLICY IF EXISTS "Authenticated users can read contact history" ON contact_history;
CREATE POLICY "Authenticated users can read contact history" ON contact_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can insert history entries
DROP POLICY IF EXISTS "Authenticated users can create contact history" ON contact_history;
CREATE POLICY "Authenticated users can create contact history" ON contact_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update history entries
DROP POLICY IF EXISTS "Authenticated users can update contact history" ON contact_history;
CREATE POLICY "Authenticated users can update contact history" ON contact_history
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
