/*
  # Add Name Fields to Profiles

  ## Overview
  Adds first_name and last_name fields to the profiles table to store user names
  collected during signup.

  ## Changes
  1. New Columns
    - `first_name` (text) - User's first name
    - `last_name` (text) - User's last name

  ## Important Notes
  - Uses IF NOT EXISTS to safely add columns
  - Fields are nullable to support existing profiles
  - Names are collected during signup and stored in user metadata
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name text;
  END IF;
END $$;
