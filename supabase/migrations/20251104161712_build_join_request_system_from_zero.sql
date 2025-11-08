/*
  # Build Complete Join Request System From Zero

  ## Workflow
  1. User requests to join event → row inserted into event_join_requests
  2. Trigger fires → creates notification for event host
  3. Host sees notification in NotificationCenter
  4. Host accepts → user added to event_rsvps, user notified, request deleted
  5. Host declines → user notified, request deleted

  ## Tables Created
    - event_join_requests: persistent storage for all join requests
    
  ## Security
    - RLS enabled on event_join_requests
    - Users can create and view their own requests
    - Event hosts can view and update requests for their events
*/

CREATE TABLE event_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own requests"
  ON event_join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own requests"
  ON event_join_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts view event requests"
  ON event_join_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_join_requests.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Hosts update event requests"
  ON event_join_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_join_requests.event_id
      AND events.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_join_requests.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE INDEX idx_ejr_event ON event_join_requests(event_id);
CREATE INDEX idx_ejr_user ON event_join_requests(user_id);
CREATE INDEX idx_ejr_status ON event_join_requests(status);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES event_join_requests(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_notif_request ON notifications(request_id);

CREATE OR REPLACE FUNCTION notify_host_on_join_request()
RETURNS TRIGGER AS $$
DECLARE
  host_id uuid;
  event_name text;
  requester_name text;
BEGIN
  SELECT created_by, title INTO host_id, event_name
  FROM events
  WHERE id = NEW.event_id;
  
  IF host_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(first_name || ' ' || last_name, username, 'Someone') INTO requester_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  INSERT INTO notifications (user_id, type, title, message, related_id, request_id)
  VALUES (
    host_id,
    'join_request',
    'New Join Request',
    requester_name || ' wants to join "' || event_name || '"',
    NEW.event_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
      'Your request to join "' || event_name || '" has been accepted.',
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

CREATE TRIGGER trigger_notify_host
  AFTER INSERT ON event_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_host_on_join_request();

CREATE TRIGGER trigger_handle_decision
  AFTER UPDATE ON event_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_join_request_decision();