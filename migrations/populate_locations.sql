-- =============================================================================
-- US States and Cities Data Population for Locations Taxonomy
-- =============================================================================
-- INSTRUCTIONS:
-- 1. First, find your Location taxonomy ID by running:
--    SELECT id FROM taxonomies WHERE type = 'location' OR name ILIKE '%location%';
-- 2. Replace 'YOUR_TAXONOMY_ID_HERE' with the actual UUID
-- 3. Run this script in Supabase SQL Editor
-- 4. The script uses INSERT ... ON CONFLICT to avoid duplicates
-- =============================================================================

-- Helper function to generate slug
CREATE OR REPLACE FUNCTION generate_slug(name TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Set the taxonomy ID (REPLACE THIS!)
DO $$
DECLARE
    taxonomy_uuid UUID := '58112e25-5d12-4233-980c-079e48586435';  -- <-- REPLACE THIS
    state_id UUID;
    island_id UUID;
BEGIN

-- =============================================================================
-- STATES (Level 1)
-- =============================================================================

-- Insert all 50 states
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order)
VALUES
    (taxonomy_uuid, 'Alabama', 'alabama', NULL, 0),
    (taxonomy_uuid, 'Alaska', 'alaska', NULL, 0),
    (taxonomy_uuid, 'Arizona', 'arizona', NULL, 0),
    (taxonomy_uuid, 'Arkansas', 'arkansas', NULL, 0),
    (taxonomy_uuid, 'California', 'california', NULL, 0),
    (taxonomy_uuid, 'Colorado', 'colorado', NULL, 0),
    (taxonomy_uuid, 'Connecticut', 'connecticut', NULL, 0),
    (taxonomy_uuid, 'Delaware', 'delaware', NULL, 0),
    (taxonomy_uuid, 'Florida', 'florida', NULL, 0),
    (taxonomy_uuid, 'Georgia', 'georgia', NULL, 0),
    (taxonomy_uuid, 'Hawaii', 'hawaii', NULL, 0),
    (taxonomy_uuid, 'Idaho', 'idaho', NULL, 0),
    (taxonomy_uuid, 'Illinois', 'illinois', NULL, 0),
    (taxonomy_uuid, 'Indiana', 'indiana', NULL, 0),
    (taxonomy_uuid, 'Iowa', 'iowa', NULL, 0),
    (taxonomy_uuid, 'Kansas', 'kansas', NULL, 0),
    (taxonomy_uuid, 'Kentucky', 'kentucky', NULL, 0),
    (taxonomy_uuid, 'Louisiana', 'louisiana', NULL, 0),
    (taxonomy_uuid, 'Maine', 'maine', NULL, 0),
    (taxonomy_uuid, 'Maryland', 'maryland', NULL, 0),
    (taxonomy_uuid, 'Massachusetts', 'massachusetts', NULL, 0),
    (taxonomy_uuid, 'Michigan', 'michigan', NULL, 0),
    (taxonomy_uuid, 'Minnesota', 'minnesota', NULL, 0),
    (taxonomy_uuid, 'Mississippi', 'mississippi', NULL, 0),
    (taxonomy_uuid, 'Missouri', 'missouri', NULL, 0),
    (taxonomy_uuid, 'Montana', 'montana', NULL, 0),
    (taxonomy_uuid, 'Nebraska', 'nebraska', NULL, 0),
    (taxonomy_uuid, 'Nevada', 'nevada', NULL, 0),
    (taxonomy_uuid, 'New Hampshire', 'new-hampshire', NULL, 0),
    (taxonomy_uuid, 'New Jersey', 'new-jersey', NULL, 0),
    (taxonomy_uuid, 'New Mexico', 'new-mexico', NULL, 0),
    (taxonomy_uuid, 'New York', 'new-york', NULL, 0),
    (taxonomy_uuid, 'North Carolina', 'north-carolina', NULL, 0),
    (taxonomy_uuid, 'North Dakota', 'north-dakota', NULL, 0),
    (taxonomy_uuid, 'Ohio', 'ohio', NULL, 0),
    (taxonomy_uuid, 'Oklahoma', 'oklahoma', NULL, 0),
    (taxonomy_uuid, 'Oregon', 'oregon', NULL, 0),
    (taxonomy_uuid, 'Pennsylvania', 'pennsylvania', NULL, 0),
    (taxonomy_uuid, 'Rhode Island', 'rhode-island', NULL, 0),
    (taxonomy_uuid, 'South Carolina', 'south-carolina', NULL, 0),
    (taxonomy_uuid, 'South Dakota', 'south-dakota', NULL, 0),
    (taxonomy_uuid, 'Tennessee', 'tennessee', NULL, 0),
    (taxonomy_uuid, 'Texas', 'texas', NULL, 0),
    (taxonomy_uuid, 'Utah', 'utah', NULL, 0),
    (taxonomy_uuid, 'Vermont', 'vermont', NULL, 0),
    (taxonomy_uuid, 'Virginia', 'virginia', NULL, 0),
    (taxonomy_uuid, 'Washington', 'washington', NULL, 0),
    (taxonomy_uuid, 'West Virginia', 'west-virginia', NULL, 0),
    (taxonomy_uuid, 'Wisconsin', 'wisconsin', NULL, 0),
    (taxonomy_uuid, 'Wyoming', 'wyoming', NULL, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- =============================================================================
-- HAWAII - Islands (Level 2) and Neighborhoods (Level 3)
-- =============================================================================

-- Get Hawaii's ID
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'hawaii';

-- Insert Hawaiian Islands
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order)
VALUES
    (taxonomy_uuid, 'Oahu', 'oahu', state_id, 0),
    (taxonomy_uuid, 'Maui', 'maui', state_id, 0),
    (taxonomy_uuid, 'Big Island', 'big-island', state_id, 0),
    (taxonomy_uuid, 'Kauai', 'kauai', state_id, 0),
    (taxonomy_uuid, 'Molokai', 'molokai', state_id, 0),
    (taxonomy_uuid, 'Lanai', 'lanai', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- OAHU Neighborhoods
SELECT id INTO island_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'oahu';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Waikiki', 'waikiki', island_id, 0),
    (taxonomy_uuid, 'Downtown Honolulu', 'downtown-honolulu', island_id, 0),
    (taxonomy_uuid, 'Ala Moana', 'ala-moana', island_id, 0),
    (taxonomy_uuid, 'Kailua', 'kailua', island_id, 0),
    (taxonomy_uuid, 'Kaneohe', 'kaneohe', island_id, 0),
    (taxonomy_uuid, 'Pearl City', 'pearl-city', island_id, 0),
    (taxonomy_uuid, 'Aiea', 'aiea', island_id, 0),
    (taxonomy_uuid, 'Kapolei', 'kapolei', island_id, 0),
    (taxonomy_uuid, 'Ewa Beach', 'ewa-beach', island_id, 0),
    (taxonomy_uuid, 'North Shore', 'north-shore', island_id, 0),
    (taxonomy_uuid, 'Hawaii Kai', 'hawaii-kai', island_id, 0),
    (taxonomy_uuid, 'Manoa', 'manoa', island_id, 0),
    (taxonomy_uuid, 'Makiki', 'makiki', island_id, 0),
    (taxonomy_uuid, 'Kahala', 'kahala', island_id, 0),
    (taxonomy_uuid, 'Mililani', 'mililani', island_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- MAUI Neighborhoods
SELECT id INTO island_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'maui';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Lahaina', 'lahaina', island_id, 0),
    (taxonomy_uuid, 'Kihei', 'kihei', island_id, 0),
    (taxonomy_uuid, 'Wailea', 'wailea', island_id, 0),
    (taxonomy_uuid, 'Kahului', 'kahului', island_id, 0),
    (taxonomy_uuid, 'Wailuku', 'wailuku', island_id, 0),
    (taxonomy_uuid, 'Paia', 'paia', island_id, 0),
    (taxonomy_uuid, 'Makawao', 'makawao', island_id, 0),
    (taxonomy_uuid, 'Hana', 'hana', island_id, 0),
    (taxonomy_uuid, 'Kaanapali', 'kaanapali', island_id, 0),
    (taxonomy_uuid, 'Napili', 'napili', island_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- BIG ISLAND Neighborhoods
SELECT id INTO island_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'big-island';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Kona', 'kona', island_id, 0),
    (taxonomy_uuid, 'Hilo', 'hilo', island_id, 0),
    (taxonomy_uuid, 'Kailua-Kona', 'kailua-kona', island_id, 0),
    (taxonomy_uuid, 'Waimea', 'waimea-hi', island_id, 0),
    (taxonomy_uuid, 'Volcano', 'volcano', island_id, 0),
    (taxonomy_uuid, 'Captain Cook', 'captain-cook', island_id, 0),
    (taxonomy_uuid, 'Pahoa', 'pahoa', island_id, 0),
    (taxonomy_uuid, 'Kohala Coast', 'kohala-coast', island_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- KAUAI Neighborhoods
SELECT id INTO island_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'kauai';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Lihue', 'lihue', island_id, 0),
    (taxonomy_uuid, 'Poipu', 'poipu', island_id, 0),
    (taxonomy_uuid, 'Princeville', 'princeville', island_id, 0),
    (taxonomy_uuid, 'Kapaa', 'kapaa', island_id, 0),
    (taxonomy_uuid, 'Hanalei', 'hanalei', island_id, 0),
    (taxonomy_uuid, 'Waimea', 'waimea-kauai', island_id, 0),
    (taxonomy_uuid, 'Koloa', 'koloa', island_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- =============================================================================
-- MAJOR CITIES FOR SELECT STATES (Level 2)
-- =============================================================================

-- CALIFORNIA Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'california';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Los Angeles', 'los-angeles', state_id, 0),
    (taxonomy_uuid, 'San Francisco', 'san-francisco', state_id, 0),
    (taxonomy_uuid, 'San Diego', 'san-diego', state_id, 0),
    (taxonomy_uuid, 'San Jose', 'san-jose', state_id, 0),
    (taxonomy_uuid, 'Sacramento', 'sacramento', state_id, 0),
    (taxonomy_uuid, 'Oakland', 'oakland', state_id, 0),
    (taxonomy_uuid, 'Fresno', 'fresno', state_id, 0),
    (taxonomy_uuid, 'Long Beach', 'long-beach', state_id, 0),
    (taxonomy_uuid, 'Anaheim', 'anaheim', state_id, 0),
    (taxonomy_uuid, 'Santa Barbara', 'santa-barbara', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- TEXAS Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'texas';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Houston', 'houston', state_id, 0),
    (taxonomy_uuid, 'San Antonio', 'san-antonio', state_id, 0),
    (taxonomy_uuid, 'Dallas', 'dallas', state_id, 0),
    (taxonomy_uuid, 'Austin', 'austin', state_id, 0),
    (taxonomy_uuid, 'Fort Worth', 'fort-worth', state_id, 0),
    (taxonomy_uuid, 'El Paso', 'el-paso', state_id, 0),
    (taxonomy_uuid, 'Arlington', 'arlington', state_id, 0),
    (taxonomy_uuid, 'Plano', 'plano', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- FLORIDA Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'florida';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Miami', 'miami', state_id, 0),
    (taxonomy_uuid, 'Orlando', 'orlando', state_id, 0),
    (taxonomy_uuid, 'Tampa', 'tampa', state_id, 0),
    (taxonomy_uuid, 'Jacksonville', 'jacksonville', state_id, 0),
    (taxonomy_uuid, 'Fort Lauderdale', 'fort-lauderdale', state_id, 0),
    (taxonomy_uuid, 'St. Petersburg', 'st-petersburg', state_id, 0),
    (taxonomy_uuid, 'Naples', 'naples', state_id, 0),
    (taxonomy_uuid, 'Sarasota', 'sarasota', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- NEW YORK Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'new-york';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'New York City', 'new-york-city', state_id, 0),
    (taxonomy_uuid, 'Buffalo', 'buffalo', state_id, 0),
    (taxonomy_uuid, 'Rochester', 'rochester', state_id, 0),
    (taxonomy_uuid, 'Albany', 'albany', state_id, 0),
    (taxonomy_uuid, 'Syracuse', 'syracuse', state_id, 0),
    (taxonomy_uuid, 'Yonkers', 'yonkers', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- ARIZONA Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'arizona';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Phoenix', 'phoenix', state_id, 0),
    (taxonomy_uuid, 'Tucson', 'tucson', state_id, 0),
    (taxonomy_uuid, 'Mesa', 'mesa', state_id, 0),
    (taxonomy_uuid, 'Scottsdale', 'scottsdale', state_id, 0),
    (taxonomy_uuid, 'Chandler', 'chandler', state_id, 0),
    (taxonomy_uuid, 'Tempe', 'tempe', state_id, 0),
    (taxonomy_uuid, 'Gilbert', 'gilbert', state_id, 0),
    (taxonomy_uuid, 'Glendale', 'glendale-az', state_id, 0),
    (taxonomy_uuid, 'Flagstaff', 'flagstaff', state_id, 0),
    (taxonomy_uuid, 'Sedona', 'sedona', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- WASHINGTON Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'washington';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Seattle', 'seattle', state_id, 0),
    (taxonomy_uuid, 'Spokane', 'spokane', state_id, 0),
    (taxonomy_uuid, 'Tacoma', 'tacoma', state_id, 0),
    (taxonomy_uuid, 'Vancouver', 'vancouver-wa', state_id, 0),
    (taxonomy_uuid, 'Bellevue', 'bellevue', state_id, 0),
    (taxonomy_uuid, 'Olympia', 'olympia', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- COLORADO Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'colorado';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Denver', 'denver', state_id, 0),
    (taxonomy_uuid, 'Colorado Springs', 'colorado-springs', state_id, 0),
    (taxonomy_uuid, 'Aurora', 'aurora-co', state_id, 0),
    (taxonomy_uuid, 'Fort Collins', 'fort-collins', state_id, 0),
    (taxonomy_uuid, 'Boulder', 'boulder', state_id, 0),
    (taxonomy_uuid, 'Lakewood', 'lakewood', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- ILLINOIS Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'illinois';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Chicago', 'chicago', state_id, 0),
    (taxonomy_uuid, 'Aurora', 'aurora-il', state_id, 0),
    (taxonomy_uuid, 'Naperville', 'naperville', state_id, 0),
    (taxonomy_uuid, 'Springfield', 'springfield-il', state_id, 0),
    (taxonomy_uuid, 'Rockford', 'rockford', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- NEVADA Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'nevada';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Las Vegas', 'las-vegas', state_id, 0),
    (taxonomy_uuid, 'Henderson', 'henderson', state_id, 0),
    (taxonomy_uuid, 'Reno', 'reno', state_id, 0),
    (taxonomy_uuid, 'North Las Vegas', 'north-las-vegas', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

-- OREGON Cities
SELECT id INTO state_id FROM taxonomy_entries WHERE taxonomy_id = taxonomy_uuid AND slug = 'oregon';
INSERT INTO taxonomy_entries (taxonomy_id, name, slug, parent_id, display_order) VALUES
    (taxonomy_uuid, 'Portland', 'portland', state_id, 0),
    (taxonomy_uuid, 'Salem', 'salem', state_id, 0),
    (taxonomy_uuid, 'Eugene', 'eugene', state_id, 0),
    (taxonomy_uuid, 'Bend', 'bend', state_id, 0),
    (taxonomy_uuid, 'Medford', 'medford', state_id, 0)
ON CONFLICT (taxonomy_id, slug) DO NOTHING;

RAISE NOTICE 'Location data populated successfully!';

END $$;

-- Cleanup helper function
DROP FUNCTION IF EXISTS generate_slug(TEXT);

-- =============================================================================
-- VERIFY THE DATA
-- =============================================================================
-- Run this to see the hierarchy:
-- SELECT 
--     e1.name as state,
--     e2.name as city_or_island,
--     e3.name as neighborhood
-- FROM taxonomy_entries e1
-- LEFT JOIN taxonomy_entries e2 ON e2.parent_id = e1.id
-- LEFT JOIN taxonomy_entries e3 ON e3.parent_id = e2.id
-- WHERE e1.parent_id IS NULL
-- ORDER BY e1.name, e2.name, e3.name;
