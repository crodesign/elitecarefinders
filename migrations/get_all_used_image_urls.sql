-- Function to get all image URLs currently used in homes or facilities
CREATE OR REPLACE FUNCTION get_all_used_image_urls()
RETURNS TABLE (url text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT unnest(images) FROM homes WHERE images IS NOT NULL
  UNION
  SELECT unnest(images) FROM facilities WHERE images IS NOT NULL;
END;
$$;
