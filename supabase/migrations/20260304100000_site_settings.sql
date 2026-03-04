CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (key, value) VALUES ('header_code', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value) VALUES ('injected_scripts', '[]')
ON CONFLICT (key) DO NOTHING;

INSERT INTO site_settings (key, value) VALUES ('analytics_settings', '{}')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON site_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow super_admin write" ON site_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );
