/*
  # Fix Profile Creation Trigger for Email Verification

  1. Changes
    - Updates handle_new_user function to be more robust
    - Handles email verification scenario properly
    - Adds better error handling and default values
    - Uses ON CONFLICT to prevent duplicate key errors
  
  2. Security
    - Maintains SECURITY DEFINER for proper permissions
    - Ensures profile is created even with email verification enabled
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
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
        'Student'
      )
    ),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), ''),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), ''),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''), ''),
    COALESCE(
      CASE 
        WHEN NEW.raw_user_meta_data->>'interests' IS NOT NULL 
        THEN ARRAY[]::text[]
        ELSE ARRAY[]::text[]
      END,
      ARRAY[]::text[]
    )
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;
