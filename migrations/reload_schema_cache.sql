-- Run this command in the Supabase SQL Editor if you ever add columns via API or raw SQL
-- and the frontend throws a "Could not find the [column_name] column in the schema cache" error.
-- This forces the PostgREST API engine to rebuild its cache of the database schema.

NOTIFY pgrst, 'reload schema';
