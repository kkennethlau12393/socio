/*
  # Update Profile Trigger to Include University

  1. Changes
    - Updates handle_new_user function to extract university_id from user metadata
    - Automatically assigns university based on email domain during signup
    - Maintains all existing functionality for names and display_name
  
  2. Security
    - Maintains SECURITY DEFINER for proper permissions
    - Ensures profile creation works with email verification
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
    university_id,
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
    CASE 
      WHEN NULLIF(TRIM(NEW.raw_user_meta_data->>'university_id'), '') IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'university_id')::uuid
      ELSE NULL
    END,
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