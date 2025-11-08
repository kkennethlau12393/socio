/*
  # Add Follow Notifications

  1. Changes
    - Create trigger to notify users when someone follows them
    - Notification includes follower's profile information
    - Notifications are automatically created when a new follower is added
    
  2. Security
    - Uses existing notifications RLS policies
*/

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  follower_name text;
BEGIN
  SELECT first_name || ' ' || last_name INTO follower_name
  FROM profiles
  WHERE id = NEW.follower_id;
  
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New Follower',
    follower_name || ' started following you',
    NEW.follower_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_follower ON followers;
CREATE TRIGGER on_new_follower
  AFTER INSERT ON followers
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();