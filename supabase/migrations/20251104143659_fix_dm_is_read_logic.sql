/*
  # Fix Direct Message is_read Logic
  
  1. Changes
    - Updates all existing messages where sender owns the message to mark as read
    - This fixes the bug where users see their own sent messages as "unread"
  
  2. Logic
    - A message is "read" by the sender immediately upon sending
    - A message is "unread" for the recipient until they open the chat
*/

UPDATE direct_messages dm
SET is_read = true
FROM direct_message_rooms dmr
WHERE dm.room_id = dmr.id
  AND (
    (dm.sender_id = dmr.user1_id) OR 
    (dm.sender_id = dmr.user2_id)
  )
  AND dm.is_read = false;
