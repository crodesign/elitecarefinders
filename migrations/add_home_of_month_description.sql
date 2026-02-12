-- Add home_of_month_description column to homes table
ALTER TABLE homes 
ADD COLUMN IF NOT EXISTS home_of_month_description TEXT;
