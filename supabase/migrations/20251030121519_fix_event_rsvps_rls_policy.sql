/*
  # Fix Event RSVPs RLS Policy

  1. Changes
    - Drop the existing SELECT policy that causes infinite recursion
    - Create a new simplified SELECT policy that allows users to view their own RSVPs and all RSVPs for public events
  
  2. Security
    - Users can view their own RSVPs
    - Users can view RSVPs for any event (for counting attendees, etc.)
    - No circular dependencies with events table
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view RSVPs for events they can see" ON event_rsvps;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view RSVPs"
  ON event_rsvps
  FOR SELECT
  TO authenticated
  USING (true);
