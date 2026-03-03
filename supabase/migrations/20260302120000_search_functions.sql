-- Full keyword search functions for homes, facilities, and posts
-- Run in Supabase dashboard SQL editor

-- ── Homes ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_homes(keyword text)
RETURNS SETOF homes LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT h.* FROM homes h
  WHERE
    h.title ilike '%' || keyword || '%' OR
    h.slug ilike '%' || keyword || '%' OR
    coalesce(h.description, '') ilike '%' || keyword || '%' OR
    coalesce(h.phone, '') ilike '%' || keyword || '%' OR
    coalesce(h.email, '') ilike '%' || keyword || '%' OR
    coalesce(h.featured_label, '') ilike '%' || keyword || '%' OR
    coalesce(h.address->>'city', '') ilike '%' || keyword || '%' OR
    coalesce(h.address->>'street', '') ilike '%' || keyword || '%' OR
    coalesce(h.address->>'state', '') ilike '%' || keyword || '%' OR
    coalesce(h.address->>'zip', '') ilike '%' || keyword || '%' OR
    coalesce(h.room_details::text, '') ilike '%' || keyword || '%' OR
    h.status::text ilike '%' || keyword || '%' OR
    EXISTS (
      SELECT 1 FROM taxonomy_entries te
      WHERE te.id = ANY(h.taxonomy_entry_ids)
      AND te.name ilike '%' || keyword || '%'
    );
END;
$$;

-- ── Facilities ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_facilities(keyword text)
RETURNS SETOF facilities LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT f.* FROM facilities f
  WHERE
    f.title ilike '%' || keyword || '%' OR
    f.slug ilike '%' || keyword || '%' OR
    coalesce(f.description, '') ilike '%' || keyword || '%' OR
    coalesce(f.license_number, '') ilike '%' || keyword || '%' OR
    coalesce(f.capacity::text, '') ilike '%' || keyword || '%' OR
    coalesce(f.address->>'city', '') ilike '%' || keyword || '%' OR
    coalesce(f.address->>'street', '') ilike '%' || keyword || '%' OR
    coalesce(f.address->>'state', '') ilike '%' || keyword || '%' OR
    coalesce(f.address->>'zip', '') ilike '%' || keyword || '%' OR
    f.status::text ilike '%' || keyword || '%' OR
    EXISTS (
      SELECT 1 FROM taxonomy_entries te
      WHERE te.id = ANY(f.taxonomy_ids)
      AND te.name ilike '%' || keyword || '%'
    );
END;
$$;

-- ── Posts ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_posts(keyword text)
RETURNS SETOF posts LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.* FROM posts p
  WHERE
    p.title ilike '%' || keyword || '%' OR
    p.slug ilike '%' || keyword || '%' OR
    coalesce(p.excerpt, '') ilike '%' || keyword || '%' OR
    coalesce(p.content, '') ilike '%' || keyword || '%' OR
    p.post_type::text ilike '%' || keyword || '%' OR
    p.status::text ilike '%' || keyword || '%';
END;
$$;
