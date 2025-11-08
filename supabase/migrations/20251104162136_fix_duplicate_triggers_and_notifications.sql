/*
  # Fix Duplicate Triggers and Add Notification Count

  1. Issues Fixed
    - Remove duplicate triggers causing 2 notifications per request
    - Only keep the latest triggers
    
  2. Changes
    - Drop old duplicate triggers
    - Keep only trigger_notify_host and trigger_handle_decision
    - Update accepted notification message to say "accepted into group"
*/

DROP TRIGGER IF EXISTS on_join_request_created ON event_join_requests;
DROP TRIGGER IF EXISTS on_join_request_status_change ON event_join_requests;
DROP FUNCTION IF EXISTS notify_host_of_join_request();
DROP FUNCTION IF EXISTS handle_join_request_status_change();

CREATE OR REPLACE FUNCTION handle_join_request_decision()
RETURNS TRIGGER AS $$
DECLARE
  event_name text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT title INTO event_name FROM events WHERE id = NEW.event_id;
    
    INSERT INTO event_rsvps (event_id, user_id, status)
    VALUES (NEW.event_id, NEW.user_id, 'going')
    ON CONFLICT (event_id, user_id) DO NOTHING;
    
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.user_id,
      'request_accepted',
      'Request Accepted!',
      'You have been accepted into "' || event_name || '"',
      NEW.event_id
    );
    
    DELETE FROM event_join_requests WHERE id = NEW.id;
    RETURN NULL;
    
  ELSIF OLD.status = 'pending' AND NEW.status = 'declined' THEN
    SELECT title INTO event_name FROM events WHERE id = NEW.event_id;
    
    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.user_id,
      'request_declined',
      'Request Declined',
      'Your request to join "' || event_name || '" was declined.',
      NEW.event_id
    );
    
    DELETE FROM event_join_requests WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;