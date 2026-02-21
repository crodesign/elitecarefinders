-- Updated function: search_contacts
-- SECURITY INVOKER: runs as the calling user so RLS policies apply automatically,
-- exactly matching the behaviour of a normal .select('*') on the contacts table.
-- No user_id filter needed — RLS handles access control.
CREATE OR REPLACE FUNCTION search_contacts(
  search_term text
)
RETURNS SETOF contacts
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT *
  FROM contacts
  WHERE
      -- Text fields
      first_name                   ILIKE '%' || search_term || '%' OR
      last_name                    ILIKE '%' || search_term || '%' OR
      resident_full_name           ILIKE '%' || search_term || '%' OR
      email                        ILIKE '%' || search_term || '%' OR
      phone                        ILIKE '%' || search_term || '%' OR
      secondary_contact_name       ILIKE '%' || search_term || '%' OR
      secondary_contact_email      ILIKE '%' || search_term || '%' OR
      secondary_contact_phone      ILIKE '%' || search_term || '%' OR
      street_address               ILIKE '%' || search_term || '%' OR
      city                         ILIKE '%' || search_term || '%' OR
      state                        ILIKE '%' || search_term || '%' OR
      zip_code                     ILIKE '%' || search_term || '%' OR
      referral_name                ILIKE '%' || search_term || '%' OR
      referral_phone               ILIKE '%' || search_term || '%' OR
      pcp_name                     ILIKE '%' || search_term || '%' OR
      pcp_email                    ILIKE '%' || search_term || '%' OR
      pcp_phone                    ILIKE '%' || search_term || '%' OR
      diagnoses                    ILIKE '%' || search_term || '%' OR
      additional_notes             ILIKE '%' || search_term || '%' OR
      primary_insurance            ILIKE '%' || search_term || '%' OR
      secondary_insurance          ILIKE '%' || search_term || '%' OR
      preferred_island             ILIKE '%' || search_term || '%' OR
      preferred_neighborhood       ILIKE '%' || search_term || '%' OR
      emergency_contact_name       ILIKE '%' || search_term || '%' OR
      looking_for                  ILIKE '%' || search_term || '%' OR
      housing_additional_notes     ILIKE '%' || search_term || '%' OR
      time_to_move                 ILIKE '%' || search_term || '%' OR
      -- housing_type stored as comma-separated text
      housing_type                 ILIKE '%' || search_term || '%' OR
      -- Care / Medical array fields cast to text
      dietary_needs::text          ILIKE '%' || search_term || '%' OR
      personal_care_assistance::text ILIKE '%' || search_term || '%' OR
      health_conditions::text      ILIKE '%' || search_term || '%' OR
      mobility_level::text         ILIKE '%' || search_term || '%' OR
      medication_management::text  ILIKE '%' || search_term || '%' OR
      mental_health::text          ILIKE '%' || search_term || '%' OR
      -- Housing preference array fields
      room_type::text              ILIKE '%' || search_term || '%' OR
      bathroom_type::text          ILIKE '%' || search_term || '%' OR
      shower_type::text            ILIKE '%' || search_term || '%' OR
      interests::text              ILIKE '%' || search_term || '%';
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_contacts(text) TO authenticated;
