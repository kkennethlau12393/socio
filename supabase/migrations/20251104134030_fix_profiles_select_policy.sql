/*
  # Fix Profiles SELECT Policy

  1. Changes
    - Simplify the SELECT policy to allow users to always view their own profile
    - Allow viewing profiles from the same university
    - Remove complex conditions that might cause issues during profile updates

  2. Security
    - Users can always read their own profile
    - Users can read profiles from users at their university
*/

DROP POLICY IF EXISTS "Users can view profiles" ON profiles;

CREATE POLICY "Users can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    university_id IN (
      SELECT university_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND university_id IS NOT NULL
    )
  );
