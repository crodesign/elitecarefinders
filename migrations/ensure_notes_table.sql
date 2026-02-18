-- Ensure notes table exists
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Nullable to be safe, but code sends it
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure columns exist if table already existed without them
DO $$
BEGIN
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Public/Authenticated read access (adjust as needed, currently public mostly used for read)
-- But notes might be sensitive. Let's start with authenticated.
DROP POLICY IF EXISTS "Authenticated users can read notes" ON notes;
CREATE POLICY "Authenticated users can read notes" ON notes
    FOR SELECT
    TO authenticated
    USING (true);

-- Insert policy
DROP POLICY IF EXISTS "Authenticated users can create notes" ON notes;
CREATE POLICY "Authenticated users can create notes" ON notes
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Update policy
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes" ON notes
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Delete policy
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
CREATE POLICY "Users can delete own notes" ON notes
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR 
           EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'system_admin')));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes(contact_id);

-- ============================================================================
-- NOTE EDITS HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS note_edits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    edited_by UUID REFERENCES auth.users(id),
    edited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on note_edits
ALTER TABLE note_edits ENABLE ROW LEVEL SECURITY;

-- Note edits read policy
DROP POLICY IF EXISTS "Authenticated users can read note edits" ON note_edits;
CREATE POLICY "Authenticated users can read note edits" ON note_edits
    FOR SELECT
    TO authenticated
    USING (true);

-- Trigger to track edits
CREATE OR REPLACE FUNCTION track_note_edits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO note_edits (note_id, content, edited_by, edited_at)
    VALUES (OLD.id, OLD.content, auth.uid(), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_note_update ON notes;
CREATE TRIGGER on_note_update
    AFTER UPDATE ON notes
    FOR EACH ROW
    WHEN (OLD.content IS DISTINCT FROM NEW.content)
    EXECUTE FUNCTION track_note_edits();

