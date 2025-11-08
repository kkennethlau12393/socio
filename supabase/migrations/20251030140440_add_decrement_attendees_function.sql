/*
  # Add decrement attendees function

  1. New Functions
    - `decrement_event_attendees` - Decrements the current_attendees count for an event
      - Takes event_id as parameter
      - Safely decrements the count without going below 0
      - Returns void
  
  2. Purpose
    - Allows users to unjoin events and update the attendee count
    - Ensures attendee count never goes negative
*/

CREATE OR REPLACE FUNCTION decrement_event_attendees(event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE events
  SET current_attendees = GREATEST(0, current_attendees - 1)
  WHERE id = event_id;
END;
$$;