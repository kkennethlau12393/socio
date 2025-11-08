/*
  # Complete Join Request System Rebuild

  1. Overview
    - User requests to join an event → creates persistent join request
    - Host gets notified about the request
    - Host can accept or decline from NotificationCenter
    - On accept: user joins event automatically + user gets notified
    - On decline: user gets notified
    - Request is deleted after host takes action
    
  2. Changes
    - Drop and recreate all join request triggers
    - Create trigger to notify host when request is created
    - Create trigger to handle accepted/declined requests
    - Add request_id to notifications for tracking
    
  3. Security
    - All functions use SECURITY DEFINER to bypass RLS for internal operations
*/

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES event_join_requests(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_request_id ON notifications(request_id);

DROP TRIGGER IF EXISTS on_join_request_created ON event_join_requests;
DROP TRIGGER IF EXISTS on_join_request_status_change ON event_join_requests;
DROP FUNCTION IF EXISTS notify_host_of_join_request();
DROP FUNCTION IF EXISTS handle_join_request_status_change();

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
  
  IF event_host IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(first_name || ' ' || last_name, username, 'Someone') INTO requester_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, title, message, related_id, request_id)
  VALUES (
    event_host,
    'join_request',
    'New Join Request',
    requester_name || ' wants to join "' || event_title || '"',
    NEW.event_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE TRIGGER on_join_request_created
  AFTER INSERT ON event_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_host_of_join_request();

CREATE TRIGGER on_join_request_status_change
  AFTER UPDATE ON event_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_join_request_status_change();