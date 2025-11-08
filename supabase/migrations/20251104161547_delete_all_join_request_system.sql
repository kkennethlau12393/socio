/*
  # Delete ALL Join Request System Components

  1. Changes
    - Drop all triggers related to join requests
    - Drop all functions related to join requests
    - Drop event_join_requests table completely
    - Remove request_id column from notifications
    
  2. Start Fresh
    - This migration cleans everything so we can rebuild from zero
*/

DROP TRIGGER IF EXISTS on_join_request_created ON event_join_requests;
DROP TRIGGER IF EXISTS on_join_request_status_change ON event_join_requests;
DROP FUNCTION IF EXISTS notify_host_of_join_request();
DROP FUNCTION IF EXISTS handle_join_request_status_change();

ALTER TABLE notifications DROP COLUMN IF EXISTS request_id;

DROP TABLE IF EXISTS event_join_requests CASCADE;