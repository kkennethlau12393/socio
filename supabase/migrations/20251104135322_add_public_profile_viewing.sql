/*
  # Add Public Profile Viewing

  1. Changes
    - Allow all authenticated users to view profiles that have a username
    - This means profile is "complete" and can be viewed by others
    - Still no recursion - just checking a column on the same row

  2. Security
    - Only completed profiles (with username) are visible to others
    - Users can always see their own profile
    - No subqueries or joins
*/

-- Allow viewing profiles that are "complete" (have a username)
CREATE POLICY "view_complete_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (username IS NOT NULL AND username != '');
