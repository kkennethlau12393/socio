/*
  # Nuclear Reset - Complete Auth System Rebuild

  1. Drop EVERYTHING
    - All triggers
    - All functions
    - All policies
    - Profiles table
    
  2. Create Fresh
    - Simple profiles table
    - ONLY allow users to read/write their OWN profile (id = auth.uid())
    - NO complex queries, NO joins in policies, NO subqueries
    - Simple trigger that creates profile on signup

  3. Philosophy
    - RLS policies use ONLY auth.uid() and the table's own columns
    - NO lookups to other rows in the same table (causes recursion)
    - Keep it dead simple
*/

-- ============================================
-- STEP 1: NUCLEAR CLEANUP
-- ============================================

-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all functions
DROP FUNCTION IF EXISTS create_profile_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_my_university_id() CASCADE;

-- Drop profiles table completely
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- STEP 2: CREATE FRESH PROFILES TABLE
-- ============================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  username text UNIQUE,
  university_id uuid REFERENCES universities(id),
  interests text[] DEFAULT ARRAY[]::text[],
  degree text,
  nationality text,
  year_of_study integer,
  avatar_url text,
  display_name text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- STEP 3: ENABLE RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: SUPER SIMPLE RLS POLICIES
-- NO SUBQUERIES, NO JOINS, ONLY auth.uid()
-- ============================================

-- Policy 1: Read your own profile
CREATE POLICY "read_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Insert your own profile
CREATE POLICY "insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Policy 3: Update your own profile
CREATE POLICY "update_own_profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 4: Delete your own profile
CREATE POLICY "delete_own_profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- STEP 5: CREATE TRIGGER FUNCTION
-- Keep it simple and safe
-- ============================================

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain text;
  found_univ_id uuid;
BEGIN
  -- Get domain from email
  email_domain := split_part(NEW.email, '@', 2);
  
  -- Find university (if any)
  SELECT id INTO found_univ_id
  FROM universities
  WHERE domain = email_domain
  LIMIT 1;
  
  -- Create profile with basic info
  INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    university_id,
    display_name
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    found_univ_id,
    COALESCE(
      NULLIF(
        TRIM(
          COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || 
          COALESCE(NEW.raw_user_meta_data->>'last_name', '')
        ),
        ''
      ),
      'Student'
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================
-- STEP 6: ATTACH TRIGGER
-- ============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- ============================================
-- STEP 7: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_university_id ON profiles(university_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
