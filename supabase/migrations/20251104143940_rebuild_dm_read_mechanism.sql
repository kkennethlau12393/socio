/*
  # Rebuild Direct Message Read/Unread Mechanism
  
  1. Overview
    The `is_read` field tracks whether the RECIPIENT has read the message
    - When you SEND a message: is_read = false (recipient hasn't read it yet)
    - When recipient OPENS the chat: all their unread messages get marked is_read = true
    - Your unread count = messages WHERE sender != you AND is_read = false
  
  2. Changes
    - Reset ALL messages to is_read = false (default state)
    - This represents: "recipient hasn't opened the chat to read this yet"
  
  3. Logic
    - Sender doesn't matter for is_read status
    - is_read ONLY tracks if the recipient has viewed it
    - Opening a chat marks all messages from other person as read
*/

-- Reset all messages to unread state
UPDATE direct_messages
SET is_read = false;

-- The application will handle marking messages as read when:
-- 1. A user opens a DM chat (marks all messages from other person as read)
-- 2. A user receives a new message while chat is open (immediately marked as read)
