/*
  # Add Profile Verification and University Fields

  1. Changes to `profiles` table
    - Add `university_email` (text) - User's university email for verification (mandatory)
    - Add `nationality` (text) - User's nationality (optional)
    - Add `degree` (text) - User's degree program (optional)
    - Add `year_of_study` (integer) - Year of study (optional)
    - Add `email_verified` (boolean) - Whether university email is verified (default: false)
  
  2. Notes
    - The `university_email` field is mandatory for completing profile setup
    - The `interests` field is already present and will be used for hobbies selection
    - `university_id` is already present and will be used for university selection
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'university_email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN university_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'nationality'
  ) THEN
    ALTER TABLE profiles ADD COLUMN nationality text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'degree'
  ) THEN
    ALTER TABLE profiles ADD COLUMN degree text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'year_of_study'
  ) THEN
    ALTER TABLE profiles ADD COLUMN year_of_study integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified boolean DEFAULT false;
  END IF;
END $$;