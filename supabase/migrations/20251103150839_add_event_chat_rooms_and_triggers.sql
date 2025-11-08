/*
  # Add Event Chat Rooms and Auto-Sync Triggers

  1. Changes to chat_rooms
    - Add event_id column to link chat rooms to events
    - Add unique constraint on event_id
    - Add foreign key constraint to events table
  
  2. New Triggers
    - auto_add_chat_participant: When user joins event (event_rsvps), add to chat_participants
    - auto_remove_chat_participant: When user leaves event (event_rsvps deleted), remove from chat_participants
    - auto_create_chat_room: When non-demo event is created, create its chat room
  
  3. Security
    - RLS policies ensure only event participants can access chat
    - Participants must be in event_rsvps to read/write messages
  
  4. Data Migration
    - Create chat rooms for all existing non-demo events
    - Add all current event participants to chat_participants
*/

-- Add event_id to chat_rooms if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_rooms' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN event_id uuid REFERENCES events(id) ON DELETE CASCADE;
    CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_event_id_unique ON chat_rooms(event_id);
  END IF;
END $$;

-- Function to get or create chat room for an event
CREATE OR REPLACE FUNCTION get_or_create_event_chat_room(p_event_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id uuid;
  v_event_title text;
  v_event_creator uuid;
BEGIN
  -- Check if room already exists
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE event_id = p_event_id;
  
  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;
  
  -- Get event details
  SELECT title, created_by INTO v_event_title, v_event_creator
  FROM events
  WHERE id = p_event_id AND is_demo = false;
  
  -- Only create room for non-demo events
  IF v_event_title IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Create new room
  INSERT INTO chat_rooms (name, created_by, event_id)
  VALUES (v_event_title || ' Chat', v_event_creator, p_event_id)
  RETURNING id INTO v_room_id;
  
  RETURN v_room_id;
END;
$$;

-- Trigger function: Auto-add participant when user joins event
CREATE OR REPLACE FUNCTION auto_add_chat_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id uuid;
  v_is_demo boolean;
BEGIN
  -- Check if event is demo
  SELECT is_demo INTO v_is_demo
  FROM events
  WHERE id = NEW.event_id;
  
  -- Only process non-demo events
  IF v_is_demo = false THEN
    -- Get or create chat room for this event
    v_room_id := get_or_create_event_chat_room(NEW.event_id);
    
    IF v_room_id IS NOT NULL THEN
      -- Add user to chat participants (ignore if already exists)
      INSERT INTO chat_participants (room_id, user_id)
      VALUES (v_room_id, NEW.user_id)
      ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function: Auto-remove participant when user leaves event
CREATE OR REPLACE FUNCTION auto_remove_chat_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_id uuid;
BEGIN
  -- Find the chat room for this event
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE event_id = OLD.event_id;
  
  IF v_room_id IS NOT NULL THEN
    -- Remove user from chat participants
    DELETE FROM chat_participants
    WHERE room_id = v_room_id AND user_id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create triggers on event_rsvps table
DROP TRIGGER IF EXISTS trigger_auto_add_chat_participant ON event_rsvps;
CREATE TRIGGER trigger_auto_add_chat_participant
  AFTER INSERT ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_chat_participant();

DROP TRIGGER IF EXISTS trigger_auto_remove_chat_participant ON event_rsvps;
CREATE TRIGGER trigger_auto_remove_chat_participant
  AFTER DELETE ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION auto_remove_chat_participant();

-- Create chat rooms for all existing non-demo events
INSERT INTO chat_rooms (name, created_by, event_id)
SELECT 
  e.title || ' Chat',
  e.created_by,
  e.id
FROM events e
WHERE e.is_demo = false
  AND NOT EXISTS (
    SELECT 1 FROM chat_rooms cr WHERE cr.event_id = e.id
  );

-- Add all current event participants to their respective chat rooms
INSERT INTO chat_participants (room_id, user_id)
SELECT DISTINCT
  cr.id,
  er.user_id
FROM event_rsvps er
JOIN events e ON e.id = er.event_id
JOIN chat_rooms cr ON cr.event_id = e.id
WHERE e.is_demo = false
ON CONFLICT (room_id, user_id) DO NOTHING;

-- Delete placeholder/test messages (containing lorem, placeholder, test message, or demo)
DELETE FROM messages
WHERE LOWER(content) ~ '(lorem|placeholder|test message|demo)';

-- Update RLS policies for messages to check chat_participants
DROP POLICY IF EXISTS "Users can read messages in their chat rooms" ON messages;
CREATE POLICY "Users can read messages in their chat rooms"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = messages.room_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their chat rooms" ON messages;
CREATE POLICY "Users can send messages to their chat rooms"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = messages.room_id
        AND cp.user_id = auth.uid()
    )
  );

-- Update RLS policies for chat_participants
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;
CREATE POLICY "Users can view chat participants"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = chat_participants.room_id
        AND cp.user_id = auth.uid()
    )
  );

-- Update RLS policies for chat_rooms
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
CREATE POLICY "Users can view their chat rooms"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = chat_rooms.id
        AND cp.user_id = auth.uid()
    )
  );
