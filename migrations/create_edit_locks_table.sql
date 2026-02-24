-- Edit Locks table for preventing concurrent edits
CREATE TABLE IF NOT EXISTS edit_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,          -- 'home', 'facility', 'post'
    entity_id UUID NOT NULL,
    locked_by UUID NOT NULL REFERENCES auth.users(id),
    locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
    UNIQUE(entity_type, entity_id)
);

-- Auto-cleanup expired locks
CREATE INDEX IF NOT EXISTS idx_edit_locks_expires ON edit_locks(expires_at);

-- RLS: Allow authenticated users to manage locks
ALTER TABLE edit_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage edit locks"
    ON edit_locks
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
