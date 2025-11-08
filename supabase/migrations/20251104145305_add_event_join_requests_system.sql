/*
  # Add Event Join Requests System
  
  1. New Tables
    - `event_join_requests`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `user_id` (uuid, references profiles)
      - `status` (text: 'pending', 'accepted', 'declined')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS
    - Users can create requests
    - Users can view their own requests
    - Event hosts can view requests for their events
    - Event hosts can update request status
*/

CREATE TABLE IF NOT EXISTS event_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create join requests"
  ON event_join_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests"
  ON event_join_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Event hosts can view requests for their events"
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

CREATE POLICY "Event hosts can update request status"
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

CREATE INDEX IF NOT EXISTS idx_event_join_requests_event_id ON event_join_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_user_id ON event_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_event_join_requests_status ON event_join_requests(status);
