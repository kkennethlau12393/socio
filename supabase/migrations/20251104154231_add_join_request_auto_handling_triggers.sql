/*
  # Add Automatic Join Request Handling

  1. Changes
    - Create trigger function to automatically handle accepted requests
    - Create trigger function to notify users of declined requests
    - When host accepts: automatically create RSVP and delete request
    - When host declines: create notification for user and delete request
    
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS for internal operations
    - All operations are validated through the trigger context
*/

CREATE OR REPLACE FUNCTION handle_join_request_status_change()
RETURNS TRIGGER AS $$
DECLARE
  event_title text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT title INTO event_title FROM events WHERE id = NEW.event_id;
    
    INSERT INTO event_rsvps (event_id, user_id)
    VALUES (NEW.event_id, NEW.user_id)
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.user_id,
      'request_accepted',
      'Request Accepted!',
      'Your request to join "' || event_title || '" has been accepted. You are now attending this event.',
      NEW.event_id
    );
    
    DELETE FROM event_join_requests WHERE id = NEW.id;
    
    RETURN NULL;
    
  ELSIF OLD.status = 'pending' AND NEW.status = 'declined' THEN
    SELECT title INTO event_title FROM events WHERE id = NEW.event_id;
    
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.user_id,
      'request_declined',
      'Request Declined',
      'Your request to join "' || event_title || '" has been declined by the host.',
      NEW.event_id
    );
    
    DELETE FROM event_join_requests WHERE id = NEW.id;
    
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_join_request_status_change ON event_join_requests;

CREATE TRIGGER on_join_request_status_change
  AFTER UPDATE ON event_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_join_request_status_change();