-- Allow anonymous (unauthenticated) users to read site_settings.
-- Required for public-facing features like social media links in the header.
CREATE POLICY "Allow public read" ON site_settings
    FOR SELECT TO anon USING (true);
