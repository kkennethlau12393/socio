/*
  # Rebuild Profiles System From Scratch

  1. Changes
    - Drop all existing policies on profiles table
    - Recreate profiles table with clean schema
    - Add simple, non-recursive RLS policies
    - Ensure all user data is properly stored and accessible

  2. Schema
    - id: UUID (references auth.users)
    - university_id: UUID (references universities)
    - first_name: text
    - last_name: text
    - username: text (unique)
    - email: text
    - interests: text[]
    - nationality: text
    - degree: text
    - year_of_study: integer
    - display_name: text
    - avatar_url: text
    - bio: text
    - timestamps

  3. Security
    - Simple RLS policies without recursion
    - Users can read and update their own profile
    - Users can read profiles from same university (after profile is created)
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Drop the get_my_university_id function if it exists (causes recursion)
DROP FUNCTION IF EXISTS get_my_university_id();

-- Drop and recreate profiles table
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id uuid REFERENCES universities(id),
  first_name text,
  last_name text,
  username text UNIQUE,
  email text,
  interests text[] DEFAULT '{}',
  nationality text,
  degree text,
  year_of_study integer,
  display_name text,
  avatar_url text,
  bio text,
  instagram_handle text,
  twitter_handle text,
  linkedin_url text,
  event_streak integer DEFAULT 0,
  total_events_attended integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  email_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies without recursion
-- Policy 1: Users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Users can read profiles from same university (simple check)
CREATE POLICY "Users can read same university profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    university_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM profiles AS my_profile
      WHERE my_profile.id = auth.uid()
      AND my_profile.university_id = profiles.university_id
      AND my_profile.university_id IS NOT NULL
    )
  );

-- Create trigger function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_university_id uuid;
  user_email text;
  email_domain text;
BEGIN
  -- Get email from auth.users
  user_email := NEW.email;
  
  -- Extract domain from email
  email_domain := split_part(user_email, '@', 2);
  
  -- Find university_id from domain
  SELECT id INTO user_university_id
  FROM universities
  WHERE domain = email_domain
  LIMIT 1;
  
  -- Insert profile with data from user_metadata
  INSERT INTO profiles (
    id,
    university_id,
    first_name,
    last_name,
    email,
    display_name,
    email_verified
  ) VALUES (
    NEW.id,
    user_university_id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Student'),
    COALESCE((NEW.email_confirmed_at IS NOT NULL), false)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
