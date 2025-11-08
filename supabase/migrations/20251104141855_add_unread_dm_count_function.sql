/*
  # Add function to count unread DMs

  1. New Functions
    - `get_unread_dm_count(user_id)` - Returns count of unread messages for a user
      - Counts messages where user is recipient (not sender) and is_read is false
      - Only counts messages in rooms the user is part of
  
  2. Security
    - Function is SECURITY DEFINER to bypass RLS
    - Only returns count, no message content
*/

CREATE OR REPLACE FUNCTION get_unread_dm_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO unread_count
  FROM direct_messages dm
  JOIN direct_message_rooms dmr ON dm.room_id = dmr.id
  WHERE (dmr.user1_id = p_user_id OR dmr.user2_id = p_user_id)
    AND dm.sender_id != p_user_id
    AND dm.is_read = false;
  
  RETURN unread_count;
END;
$$;
