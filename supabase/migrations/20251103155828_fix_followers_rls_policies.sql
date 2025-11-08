/*
  # Fix Followers RLS Policies

  1. Changes
    - Drop existing restrictive SELECT policies
    - Add new policy to allow all authenticated users to view all follower relationships
    - This allows users to see follower/following counts for anyone
    - Keep INSERT and DELETE policies as they are (users can only follow/unfollow themselves)

  2. Security
    - All authenticated users can view follower relationships (public information)
    - Users can only create follows for themselves
    - Users can only delete their own follows
*/

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own followers" ON followers;
DROP POLICY IF EXISTS "Users can view own following" ON followers;
DROP POLICY IF EXISTS "Users can view followed users relationships" ON followers;

-- Create new open SELECT policy for all authenticated users
CREATE POLICY "Anyone can view follower relationships"
  ON followers FOR SELECT
  TO authenticated
  USING (true);
