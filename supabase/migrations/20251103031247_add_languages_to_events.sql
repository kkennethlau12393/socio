/*
  # Add languages field to events table

  1. Changes
    - Add `languages` column to `events` table as a text array
    - This will store one or more languages that the event will be conducted in
    - Examples: ['English'], ['English', 'Spanish'], ['Mandarin']
  
  2. Notes
    - Default value is empty array
    - This field is optional and can be updated by event creators
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'languages'
  ) THEN
    ALTER TABLE events ADD COLUMN languages text[] DEFAULT '{}';
  END IF;
END $$;
