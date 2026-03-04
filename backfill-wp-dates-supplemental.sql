-- Supplemental WP date backfill for entities missing from original SQL
-- Run in Supabase dashboard SQL editor

ALTER TABLE homes DISABLE TRIGGER USER;
ALTER TABLE facilities DISABLE TRIGGER USER;

-- Homes
-- coming-soon (was aiea-care-home-coming-soon in WP, exact dates from XML)
UPDATE homes SET created_at = '2025-02-16T21:25:24Z', updated_at = '2025-02-20T19:29:50Z' WHERE slug = 'coming-soon';

-- pcty-1006: between pcty-1005 (2022-02-16) and pcty-1007 (2022-05-25) — estimated ~4 years ago
UPDATE homes SET created_at = '2022-04-01T08:00:00Z', updated_at = '2022-05-10T06:00:00Z' WHERE slug = 'pcty-1006';

-- ewab-1032: between ewab-1031 (2022-07-23) and ewab-1033 (2022-07-14) — estimated ~4 years ago
UPDATE homes SET created_at = '2022-07-15T05:00:00Z', updated_at = '2022-08-01T04:00:00Z' WHERE slug = 'ewab-1032';

-- kple-1005: between kple-1003 (2021-10-07) and kple-1006 (2022-07-23) — estimated ~4 years ago
UPDATE homes SET created_at = '2022-03-15T08:00:00Z', updated_at = '2022-07-10T06:00:00Z' WHERE slug = 'kple-1005';

-- slake-1015: between slake-1014 (2022-05-12) and slake-1016 (2022-08-22) — estimated ~4 years ago
UPDATE homes SET created_at = '2022-07-01T06:00:00Z', updated_at = '2022-08-15T05:00:00Z' WHERE slug = 'slake-1015';

-- wphu-gemma-alvia: estimated ~5 years ago, fits in the 2021 wphu range
UPDATE homes SET created_at = '2021-06-15T07:00:00Z', updated_at = '2022-01-05T06:00:00Z' WHERE slug = 'wphu-gemma-alvia';

-- Facilities
-- Plaza locations: estimated ~2 years ago
UPDATE facilities SET created_at = '2024-03-01T08:00:00Z', updated_at = '2024-06-01T06:00:00Z' WHERE slug = 'the-plaza-at-kaneohe';
UPDATE facilities SET created_at = '2024-03-01T08:30:00Z', updated_at = '2024-06-01T07:00:00Z' WHERE slug = 'the-plaza-at-pearl-city';
UPDATE facilities SET created_at = '2024-03-01T09:00:00Z', updated_at = '2024-06-01T08:00:00Z' WHERE slug = 'the-plaza-at-moanalua';
UPDATE facilities SET created_at = '2024-03-01T09:30:00Z', updated_at = '2024-06-01T09:00:00Z' WHERE slug = 'the-plaza-at-mililani';

ALTER TABLE homes ENABLE TRIGGER USER;
ALTER TABLE facilities ENABLE TRIGGER USER;
