/*
  # Fix Chat Participants RLS Infinite Recursion

  1. Issue
    - RLS policy on chat_participants references itself, causing infinite recursion
    - Policy checks chat_participants to determine access to chat_participants
  
  2. Solution
    - Change policy to check event_rsvps directly instead of chat_participants
    - User can view chat_participants if they're in event_rsvps for that event
    - This breaks the circular dependency
  
  3. Security
    - Still maintains proper access control
    - Only event participants can see chat room participants
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;

-- Create new policy that checks event_rsvps instead of chat_participants
CREATE POLICY "Users can view chat participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM event_rsvps er
      JOIN chat_rooms cr ON cr.event_id = er.event_id
      WHERE cr.id = chat_participants.room_id
        AND er.user_id = auth.uid()
    )
  );

-- Also update the chat_rooms policy to check event_rsvps directly
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
CREATE POLICY "Users can view their chat rooms"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM event_rsvps er
      WHERE er.event_id = chat_rooms.event_id
        AND er.user_id = auth.uid()
    )
  );
