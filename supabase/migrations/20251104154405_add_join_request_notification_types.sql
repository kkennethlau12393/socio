/*
  # Add Join Request Notification Types

  1. Changes
    - Update the notifications type check constraint to include 'request_accepted' and 'request_declined'
    - These types are needed for the join request workflow
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
  'request_declined'::text
]));