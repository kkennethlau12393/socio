/*
  # Fix Profiles RLS with Security Definer Function

  ## Overview
  Completely fixes the infinite recursion issue by creating a security definer
  function that bypasses RLS to get the user's university_id.

  ## Changes
  1. Create security definer function to get user's university_id (returns UUID)
  2. Drop existing SELECT policies that cause recursion
  3. Create new SELECT policy using the security definer function

  ## Security
  - Security definer function safely bypasses RLS for specific lookup
  - Users can view their own profile
  - Users can view profiles from same university
  - No infinite recursion
*/

-- Create a security definer function to get the current user's university_id
CREATE OR REPLACE FUNCTION public.get_my_university_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT university_id FROM profiles WHERE id = auth.uid();
$$;

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles from same university" ON profiles;

-- Create new SELECT policy without recursion
CREATE POLICY "Users can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR (
      university_id IS NOT NULL 
      AND university_id = get_my_university_id()
    )
  );
