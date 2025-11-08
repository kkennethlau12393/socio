/*
  # Update Profile Trigger to Include Names

  ## Overview
  Updates the handle_new_user trigger function to extract and store first_name
  and last_name from user metadata during signup.

  ## Changes
  1. Modifies handle_new_user function
    - Extracts first_name and last_name from user metadata
    - Stores them in the profiles table
    - Maintains backward compatibility if metadata is missing

  ## Important Notes
  - Names are extracted from user_metadata set during signup
  - Falls back to empty string if metadata is not present
  - Replaces existing trigger function
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    first_name,
    last_name,
    interests
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    ARRAY[]::text[]
  );
  RETURN NEW;
END;
$$;
