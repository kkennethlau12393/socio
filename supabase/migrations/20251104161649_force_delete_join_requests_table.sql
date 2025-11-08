/*
  # Force Delete Join Requests Table

  1. Changes
    - Force drop event_join_requests table with CASCADE
*/

DROP TABLE IF EXISTS event_join_requests CASCADE;