-- Contact documents table
CREATE TABLE contact_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    url TEXT NOT NULL,
    url_thumb TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fetching documents by contact
CREATE INDEX idx_contact_documents_contact_id ON contact_documents(contact_id);

-- RLS: authenticated users only
ALTER TABLE contact_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contact documents"
    ON contact_documents FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert contact documents"
    ON contact_documents FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contact documents"
    ON contact_documents FOR DELETE
    TO authenticated
    USING (true);
