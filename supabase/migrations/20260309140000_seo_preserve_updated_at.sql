-- Preserve updated_at when only SEO fields change on homes, facilities, and posts.
-- Creates table-specific trigger functions that compare non-SEO columns
-- and only bump updated_at when actual content changes.

-- ============================================================
-- HOMES
-- ============================================================
CREATE OR REPLACE FUNCTION update_homes_updated_at_fn()
RETURNS TRIGGER AS $$
BEGIN
    -- Only bump updated_at when a non-SEO column actually changed
    IF (
        OLD.title IS DISTINCT FROM NEW.title OR
        OLD.slug IS DISTINCT FROM NEW.slug OR
        OLD.description IS DISTINCT FROM NEW.description OR
        OLD.address IS DISTINCT FROM NEW.address OR
        OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.email IS DISTINCT FROM NEW.email OR
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.display_reference_number IS DISTINCT FROM NEW.display_reference_number OR
        OLD.show_address IS DISTINCT FROM NEW.show_address OR
        OLD.taxonomy_entry_ids IS DISTINCT FROM NEW.taxonomy_entry_ids OR
        OLD.is_featured IS DISTINCT FROM NEW.is_featured OR
        OLD.has_featured_video IS DISTINCT FROM NEW.has_featured_video OR
        OLD.is_home_of_month IS DISTINCT FROM NEW.is_home_of_month OR
        OLD.featured_label IS DISTINCT FROM NEW.featured_label OR
        OLD.home_of_month_description IS DISTINCT FROM NEW.home_of_month_description OR
        OLD.excerpt IS DISTINCT FROM NEW.excerpt OR
        OLD.images IS DISTINCT FROM NEW.images OR
        OLD.team_images IS DISTINCT FROM NEW.team_images OR
        OLD.cuisine_images IS DISTINCT FROM NEW.cuisine_images OR
        OLD.videos IS DISTINCT FROM NEW.videos OR
        OLD.room_details IS DISTINCT FROM NEW.room_details
    ) THEN
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop any existing updated_at triggers on homes (common naming patterns)
DROP TRIGGER IF EXISTS update_homes_updated_at ON homes;
DROP TRIGGER IF EXISTS homes_updated_at_trigger ON homes;
DROP TRIGGER IF EXISTS set_updated_at ON homes;
DROP TRIGGER IF EXISTS moddatetime ON homes;

CREATE TRIGGER update_homes_updated_at
    BEFORE UPDATE ON homes
    FOR EACH ROW
    EXECUTE PROCEDURE update_homes_updated_at_fn();

-- ============================================================
-- FACILITIES
-- ============================================================
CREATE OR REPLACE FUNCTION update_facilities_updated_at_fn()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        OLD.title IS DISTINCT FROM NEW.title OR
        OLD.slug IS DISTINCT FROM NEW.slug OR
        OLD.description IS DISTINCT FROM NEW.description OR
        OLD.address IS DISTINCT FROM NEW.address OR
        OLD.license_number IS DISTINCT FROM NEW.license_number OR
        OLD.capacity IS DISTINCT FROM NEW.capacity OR
        OLD.taxonomy_ids IS DISTINCT FROM NEW.taxonomy_ids OR
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.excerpt IS DISTINCT FROM NEW.excerpt OR
        OLD.images IS DISTINCT FROM NEW.images OR
        OLD.team_images IS DISTINCT FROM NEW.team_images OR
        OLD.cuisine_images IS DISTINCT FROM NEW.cuisine_images OR
        OLD.videos IS DISTINCT FROM NEW.videos OR
        OLD.room_details IS DISTINCT FROM NEW.room_details OR
        OLD.is_featured IS DISTINCT FROM NEW.is_featured OR
        OLD.has_featured_video IS DISTINCT FROM NEW.has_featured_video OR
        OLD.is_facility_of_month IS DISTINCT FROM NEW.is_facility_of_month OR
        OLD.featured_label IS DISTINCT FROM NEW.featured_label OR
        OLD.facility_of_month_description IS DISTINCT FROM NEW.facility_of_month_description
    ) THEN
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_facilities_updated_at ON facilities;
DROP TRIGGER IF EXISTS facilities_updated_at_trigger ON facilities;
DROP TRIGGER IF EXISTS set_updated_at ON facilities;
DROP TRIGGER IF EXISTS moddatetime ON facilities;

CREATE TRIGGER update_facilities_updated_at
    BEFORE UPDATE ON facilities
    FOR EACH ROW
    EXECUTE PROCEDURE update_facilities_updated_at_fn();

-- ============================================================
-- POSTS (replace existing trigger with SEO-aware version)
-- ============================================================
CREATE OR REPLACE FUNCTION update_posts_updated_at_fn()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        OLD.title IS DISTINCT FROM NEW.title OR
        OLD.slug IS DISTINCT FROM NEW.slug OR
        OLD.content IS DISTINCT FROM NEW.content OR
        OLD.excerpt IS DISTINCT FROM NEW.excerpt OR
        OLD.video_url IS DISTINCT FROM NEW.video_url OR
        OLD.images IS DISTINCT FROM NEW.images OR
        OLD.author_id IS DISTINCT FROM NEW.author_id OR
        OLD.post_type IS DISTINCT FROM NEW.post_type OR
        OLD.status IS DISTINCT FROM NEW.status OR
        OLD.metadata IS DISTINCT FROM NEW.metadata OR
        OLD.published_at IS DISTINCT FROM NEW.published_at
    ) THEN
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
DROP TRIGGER IF EXISTS posts_updated_at_trigger ON posts;
DROP TRIGGER IF EXISTS set_updated_at ON posts;
DROP TRIGGER IF EXISTS moddatetime ON posts;

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE PROCEDURE update_posts_updated_at_fn();
