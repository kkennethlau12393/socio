/*
  # Create Direct Messages System

  1. New Tables
    - `direct_message_rooms`
      - `id` (uuid, primary key) - Unique room identifier
      - `user1_id` (uuid) - First user in the conversation
      - `user2_id` (uuid) - Second user in the conversation
      - `created_at` (timestamptz) - When the DM room was created
      - `updated_at` (timestamptz) - Last message timestamp for sorting
      - Unique constraint on user1_id and user2_id to prevent duplicates
    
    - `direct_messages`
      - `id` (uuid, primary key) - Message identifier
      - `room_id` (uuid) - Reference to direct_message_rooms
      - `sender_id` (uuid) - User who sent the message
      - `content` (text) - Message content
      - `is_read` (boolean) - Whether the message has been read
      - `created_at` (timestamptz) - When the message was sent

  2. Security
    - Enable RLS on both tables
    - Users can only view DM rooms they are part of
    - Users can only send messages in rooms they are part of
    - Users can only view messages in rooms they are part of

  3. Functions
    - Function to check if two users mutually follow each other
    - Trigger to update room's updated_at when new message is sent
*/

-- Create function to check mutual follow
CREATE OR REPLACE FUNCTION check_mutual_follow(user1 uuid, user2 uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM followers 
    WHERE follower_id = user1 AND following_id = user2
  ) AND EXISTS (
    SELECT 1 FROM followers 
    WHERE follower_id = user2 AND following_id = user1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create direct_message_rooms table
CREATE TABLE IF NOT EXISTS direct_message_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT different_users CHECK (user1_id != user2_id),
  CONSTRAINT ordered_users CHECK (user1_id < user2_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS direct_message_rooms_users_idx 
  ON direct_message_rooms(user1_id, user2_id);

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES direct_message_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS direct_messages_room_id_idx ON direct_messages(room_id);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx ON direct_messages(created_at DESC);

-- Enable RLS
ALTER TABLE direct_message_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for direct_message_rooms
CREATE POLICY "Users can view their own DM rooms"
  ON direct_message_rooms FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create DM rooms with mutual followers"
  ON direct_message_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND check_mutual_follow(user1_id, user2_id)
  );

-- RLS Policies for direct_messages
CREATE POLICY "Users can view messages in their rooms"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM direct_message_rooms
      WHERE id = room_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their rooms"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM direct_message_rooms
      WHERE id = room_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON direct_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Function to update room's updated_at timestamp
CREATE OR REPLACE FUNCTION update_dm_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE direct_message_rooms
  SET updated_at = NEW.created_at
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update room timestamp on new message
DROP TRIGGER IF EXISTS update_dm_room_timestamp_trigger ON direct_messages;
CREATE TRIGGER update_dm_room_timestamp_trigger
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_room_timestamp();