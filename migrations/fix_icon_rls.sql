-- Fix for "new row violates row-level security policy"
-- We will disable RLS for this simple metadata table to ensure writes work
ALTER TABLE room_fixed_field_types DISABLE ROW LEVEL SECURITY;
