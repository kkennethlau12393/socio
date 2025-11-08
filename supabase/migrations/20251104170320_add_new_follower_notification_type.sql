/*
  # Add new_follower notification type

  1. Changes
    - Drop existing notifications_type_check constraint
    - Add new constraint that includes 'new_follower' type
    - This allows follow notifications to be created properly
    
  2. Security
    - Uses existing notifications RLS policies
*/

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'follow'::text, 
  'event_invite'::text, 
  'event_reminder'::text, 
  'society_event'::text, 
  'new_follower_event'::text, 
  'request_accepted'::text, 
  'request_declined'::text, 
  'join_request'::text,
  'new_follower'::text
]));