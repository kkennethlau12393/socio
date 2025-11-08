/*
  # Remove All Recursive Chat Policies and Create Clean Ones

  1. Issue
    - Multiple conflicting RLS policies exist
    - Old policies still reference chat_participants recursively
    - policies: participants_select_if_member, rooms_select_if_participant cause infinite recursion
  
  2. Solution
    - Drop ALL existing chat-related RLS policies
    - Create new simple policies that check event_rsvps directly
    - No circular dependencies
  
  3. Security
    - Users can only access chats for events they've joined (in event_rsvps)
    - No recursive checks needed
*/

-- Drop ALL existing policies for chat tables
DROP POLICY IF EXISTS "participants_select_if_member" ON chat_participants;
DROP POLICY IF EXISTS "participants_insert_self" ON chat_participants;
DROP POLICY IF EXISTS "participants_delete_self" ON chat_participants;
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;

DROP POLICY IF EXISTS "rooms_select_if_participant" ON chat_rooms;
DROP POLICY IF EXISTS "rooms_insert_require_creator" ON chat_rooms;
DROP POLICY IF EXISTS "rooms_update_if_creator" ON chat_rooms;
DROP POLICY IF EXISTS "rooms_delete_if_creator" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;

DROP POLICY IF EXISTS "messages_select_if_participant" ON messages;
DROP POLICY IF EXISTS "messages_insert_if_participant_and_self" ON messages;
DROP POLICY IF EXISTS "messages_update_if_sender" ON messages;
DROP POLICY IF EXISTS "messages_delete_if_sender" ON messages;
DROP POLICY IF EXISTS "Users can read messages in their chat rooms" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their chat rooms" ON messages;

-- Create new clean policies for chat_rooms
-- Users can view chat rooms for events they've joined
CREATE POLICY "chat_rooms_select_if_event_member"
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

-- Create new clean policies for chat_participants
-- Users can view participants in rooms for events they've joined
CREATE POLICY "chat_participants_select_if_event_member"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM chat_rooms cr
      JOIN event_rsvps er ON er.event_id = cr.event_id
      WHERE cr.id = chat_participants.room_id
        AND er.user_id = auth.uid()
    )
  );

-- Create new clean policies for messages
-- Users can read messages in rooms for events they've joined
CREATE POLICY "messages_select_if_event_member"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM chat_rooms cr
      JOIN event_rsvps er ON er.event_id = cr.event_id
      WHERE cr.id = messages.room_id
        AND er.user_id = auth.uid()
    )
  );

-- Users can send messages to rooms for events they've joined
CREATE POLICY "messages_insert_if_event_member"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM chat_rooms cr
      JOIN event_rsvps er ON er.event_id = cr.event_id
      WHERE cr.id = messages.room_id
        AND er.user_id = auth.uid()
    )
  );
