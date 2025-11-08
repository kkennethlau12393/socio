/*
  # Fix Group Members RLS Policy

  1. Changes
    - Drop the restrictive SELECT policy that creates a circular dependency
    - Add new SELECT policy that allows users to view their own group memberships
    - Add policy to allow viewing members of public groups
  
  2. Security
    - Users can always see their own memberships (needed for loading state on refresh)
    - Users can see members of any group (groups are social and members are visible)
    - Insert and delete remain restricted to own records
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view group members for groups they're in" ON group_members;

-- Allow users to view their own group memberships
CREATE POLICY "Users can view their own group memberships"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to view all group members (groups are social)
CREATE POLICY "Users can view all group members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (true);
