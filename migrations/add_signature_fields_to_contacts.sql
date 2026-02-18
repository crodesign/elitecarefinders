-- Add signature and waiver columns to contacts table
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS signature_name TEXT,
  ADD COLUMN IF NOT EXISTS signature_date TEXT,
  ADD COLUMN IF NOT EXISTS signature_data TEXT,
  ADD COLUMN IF NOT EXISTS waiver_text TEXT,
  ADD COLUMN IF NOT EXISTS waiver_agreed BOOLEAN DEFAULT FALSE;
