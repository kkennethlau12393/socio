/*
  # Create Profile Trigger for New Users

  ## Overview
  This migration creates an automatic trigger that creates a profile entry
  whenever a new user signs up through Supabase Auth.

  ## Changes
  1. Creates a function to handle new user creation
  2. Sets up a trigger on auth.users table
  3. Automatically creates profiles with default values

  ## Important Notes
  - Profiles are created with empty interests array (needs completion)
  - Default display name is set to "Student"
  - All optional fields are null initially
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, interests)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Student'),
    ARRAY[]::text[]
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
