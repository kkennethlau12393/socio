/*
  # Fix Direct Messages UPDATE Policy
  
  1. Problem
    - Current policy only allows updating your OWN messages (sender_id = auth.uid())
    - But marking as read requires updating OTHER PERSON's messages
  
  2. Solution
    - Allow users to update ANY message in rooms they're part of
    - This enables marking received messages as read
    - Users still can't update messages in rooms they're not part of
*/

DROP POLICY IF EXISTS "Users can update their own messages" ON direct_messages;

CREATE POLICY "Users can update messages in their rooms"
  ON direct_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_message_rooms
      WHERE direct_message_rooms.id = direct_messages.room_id
      AND (direct_message_rooms.user1_id = auth.uid() OR direct_message_rooms.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM direct_message_rooms
      WHERE direct_message_rooms.id = direct_messages.room_id
      AND (direct_message_rooms.user1_id = auth.uid() OR direct_message_rooms.user2_id = auth.uid())
    )
  );
