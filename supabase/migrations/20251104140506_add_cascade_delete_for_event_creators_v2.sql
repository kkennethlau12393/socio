/*
  # Add Cascade Delete for Event Creators

  1. Changes
    - Add foreign key constraint on events.created_by to reference profiles(id)
    - Set ON DELETE CASCADE so events are deleted when creator is deleted
    - This ensures orphaned events don't remain when users are deleted

  2. Security
    - Maintains data integrity
    - Prevents orphaned events
*/

-- Add foreign key constraint with cascade delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_created_by_fkey'
    AND table_name = 'events'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;
