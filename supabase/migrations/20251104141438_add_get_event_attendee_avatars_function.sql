/*
  # Add function to fetch attendee avatars for events

  1. New Functions
    - `get_event_attendee_avatars(event_id, limit_count)` - Returns first N attendee avatars for an event
      - Returns user_id and avatar_url
      - Public function accessible to all authenticated users
  
  2. Security
    - Function is SECURITY DEFINER to bypass RLS
    - Only returns avatar_url and user_id (no sensitive data)
*/

CREATE OR REPLACE FUNCTION get_event_attendee_avatars(
  p_event_id uuid,
  p_limit integer DEFAULT 3
)
RETURNS TABLE (
  user_id uuid,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    er.user_id,
    p.avatar_url
  FROM event_rsvps er
  JOIN profiles p ON p.id = er.user_id
  WHERE er.event_id = p_event_id
  ORDER BY er.created_at ASC
  LIMIT p_limit;
END;
$$;
