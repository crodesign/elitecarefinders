CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    meta_title TEXT DEFAULT '',
    meta_description TEXT DEFAULT '',
    canonical_url TEXT DEFAULT '',
    indexable BOOLEAN DEFAULT true,
    og_title TEXT DEFAULT '',
    og_description TEXT DEFAULT '',
    og_image_url TEXT DEFAULT '',
    schema_json JSONB DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pages (slug, label) VALUES
    ('home', 'Homepage'),
    ('about', 'About Us'),
    ('contact', 'Contact Us'),
    ('blog', 'Blog'),
    ('search', 'Search Results')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON pages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow super_admin write" ON pages
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );
