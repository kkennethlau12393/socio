/*
  # Update Event Dates to Future

  1. Changes
    - Remove past event (Sunrise Yoga)
    - Update all events to be clearly in the future (December 2025)
    - Set times during daytime hours for better visibility
  
  2. Security
    - No security changes
*/

-- Remove the past event
DELETE FROM event_rsvps WHERE event_id IN (
  SELECT id FROM events WHERE title = 'Sunrise Yoga on the Quad'
);
DELETE FROM events WHERE title = 'Sunrise Yoga on the Quad';

-- Update all remaining events to December 2025 with clear future dates
UPDATE events
SET start_time = '2025-12-02 14:00:00+00'
WHERE title = 'AI & Machine Learning Workshop';

UPDATE events
SET start_time = '2025-12-05 15:30:00+00'
WHERE title = 'Study Break: Pizza & Games';

UPDATE events
SET start_time = '2025-12-08 19:00:00+00'
WHERE title = 'Open Mic Night';

UPDATE events
SET start_time = '2025-12-12 10:00:00+00'
WHERE title = 'Campus Career Fair 2025';