/*
  # Fix Unread DM Count - Per Conversation Logic
  
  1. Changes
    - Update get_unread_dm_count to count CONVERSATIONS with unread messages
    - NOT the total number of unread messages
  
  2. Logic
    - If User A sends you 10 messages, unread count = 1 (one conversation)
    - When you open that chat, unread count decreases by 1
    - Messages you send are immediately marked as read
*/

CREATE OR REPLACE FUNCTION get_unread_dm_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(DISTINCT dm.room_id)::integer INTO unread_count
  FROM direct_messages dm
  JOIN direct_message_rooms dmr ON dm.room_id = dmr.id
  WHERE (dmr.user1_id = p_user_id OR dmr.user2_id = p_user_id)
    AND dm.sender_id != p_user_id
    AND dm.is_read = false;
  
  RETURN unread_count;
END;
$$;
