/*
  # Allow event hosts to create RSVPs when accepting join requests

  1. Changes
    - Add a new INSERT policy for event_rsvps that allows event hosts to create RSVPs for users
    - This enables the accept join request functionality to work properly
    
  2. Security
    - Only event hosts (creators) can create RSVPs for other users
    - The policy checks that the authenticated user is the creator of the event
*/

CREATE POLICY "Event hosts can create RSVPs when accepting requests"
  ON event_rsvps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_rsvps.event_id
      AND events.created_by = auth.uid()
    )
  );