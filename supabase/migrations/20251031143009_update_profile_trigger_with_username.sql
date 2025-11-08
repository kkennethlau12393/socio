/*
  # Update Profile Trigger to Include Username

  1. Changes
    - Modifies handle_new_user function to extract username from user metadata
    - Stores username in the profiles table during signup
    - Maintains backward compatibility if username is missing
  
  2. Notes
    - Username is extracted from user_metadata set during signup
    - Falls back to empty string if metadata is not present
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
    username,
    interests
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    ARRAY[]::text[]
  );
  RETURN NEW;
END;
$$;
