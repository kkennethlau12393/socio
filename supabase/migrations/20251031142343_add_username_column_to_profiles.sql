/*
  # Add username column to profiles table

  1. Changes
    - Add `username` column to `profiles` table as text type
    - Set it as unique to ensure no duplicate usernames
    - Make it nullable initially to avoid breaking existing data
  
  2. Notes
    - Username will be used for display and @mentions
    - Users can set their username during onboarding or in settings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
  END IF;
END $$;
