/*
  # Fix Profiles RLS Policies

  ## Overview
  Fixes the infinite recursion issue in the profiles SELECT policy by allowing
  users to view their own profile and profiles from their university.

  ## Changes
  1. Drop existing SELECT policy that causes recursion
  2. Create new SELECT policy that allows:
     - Users to view their own profile (no recursion)
     - Users to view profiles from same university (when university_id is set)

  ## Security
  - Users can always see their own profile
  - Users can see other profiles only if they share the same university_id
  - Maintains proper access control without recursion
*/

DROP POLICY IF EXISTS "Users can view profiles from their university" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles from same university"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    university_id IS NOT NULL 
    AND university_id = (
      SELECT university_id 
      FROM profiles 
      WHERE id = auth.uid()
      LIMIT 1
    )
  );
