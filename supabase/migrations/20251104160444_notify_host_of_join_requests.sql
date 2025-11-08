/*
  # Notify Event Hosts of Join Requests

  1. Changes
    - Add notification type 'join_request' to the allowed notification types
    - Create trigger to notify event host when someone requests to join their event
    - This notification will allow hosts to see and respond to join requests
    
  2. Security
    - Function runs with SECURITY DEFINER to create notifications for hosts
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
  'join_request'::text
]));

CREATE OR REPLACE FUNCTION notify_host_of_join_request()
RETURNS TRIGGER AS $$
DECLARE
  event_title text;
  event_host uuid;
  requester_name text;
BEGIN
  SELECT title, created_by INTO event_title, event_host 
  FROM events 
  WHERE id = NEW.event_id;
  
  SELECT COALESCE(first_name || ' ' || last_name, username) INTO requester_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    event_host,
    'join_request',
    'New Join Request',
    requester_name || ' wants to join "' || event_title || '"',
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_join_request_created ON event_join_requests;

CREATE TRIGGER on_join_request_created
  AFTER INSERT ON event_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_host_of_join_request();