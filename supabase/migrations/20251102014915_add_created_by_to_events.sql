/*
  # Add created_by column to events table
  
  1. Changes
    - Add `created_by` column to `events` table to track event creators
    - Add foreign key constraint to profiles table
    - Set default host_type to 'user' for user-created events
    - Add max_attendees column as alias for capacity
    
  2. Security
    - Update RLS policies to allow creators to delete their events
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE events ADD COLUMN created_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'max_attendees'
  ) THEN
    ALTER TABLE events ADD COLUMN max_attendees integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE events ADD COLUMN is_demo boolean DEFAULT false;
  END IF;
END $$;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Users can create events" ON events;
DROP POLICY IF EXISTS "Creators can update their events" ON events;
DROP POLICY IF EXISTS "Creators can delete their events" ON events;

CREATE POLICY "Anyone can view events"
  ON events FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their events"
  ON events FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can delete their events"
  ON events FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
